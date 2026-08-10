import { randomUUID, createHash } from "crypto";
import {
  HttpError,
  generateDeviceToken,
  appConfig,
} from "../../imports";
import { presignPut, headObject, isR2Configured } from "../../utils/r2";
import AgentRepo from "./agent_repo";
import type { IDevice } from "../../models/device_model";
import type {
  RegisterDeviceInput,
  AgentSettings,
  ActivityBatchInput,
  PresignRequestInput,
  PresignItemResult,
  ConfirmRequestInput,
  AgentEventsInput,
} from "../../types/agentTypes";

// Server-controlled defaults. Per-device overrides live on device.settingsOverride.
// (A future org-level settings collection can slot in between these and the overrides.)
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  screenshotIntervalSec: 15,
  idleThresholdSec: 300,
  quotaBytes: 2 * 1024 * 1024 * 1024, // 2 GB
  urlCaptureMode: "domain",
  blocklist: [],
  uploadConcurrency: 3,
  flushIntervalSec: 300,
  screenshotNotify: false,
  allowUserPause: true,
};

const PRESIGN_TTL_SEC = 15 * 60;

class AgentServices {
  // ── Registration ──────────────────────────────────────────────────────────
  public static registerDeviceService = async (
    userId: string,
    input: RegisterDeviceInput
  ) => {
    const tokenId = randomUUID();

    const device = await AgentRepo.upsertDevice(
      userId,
      input.hardwareId,
      {
        name: input.name,
        platform: input.platform,
        osVersion: input.osVersion ?? "",
        arch: input.arch ?? "",
        cpuModel: input.cpuModel ?? "",
        cpuCount: input.cpuCount ?? 0,
        totalMemBytes: input.totalMemBytes ?? 0,
        sessionType: input.sessionType ?? "unknown",
        capabilities: {
          degraded: input.degraded ?? [],
          weakCredentialStorage: input.weakCredentialStorage ?? false,
        },
        agentVersion: input.agentVersion ?? "",
      } as Partial<IDevice>,
      tokenId
    );

    const token = generateDeviceToken({
      deviceId: device.id,
      userId,
      tokenId,
      scope: ["agent"],
    });

    const { settings, etag } = AgentServices.resolveSettings(device);

    return {
      deviceId: device.id,
      token,
      settings,
      settingsEtag: etag,
    };
  };

  // ── Settings ────────────────────────────────────────────────────────────────
  private static resolveSettings(device: IDevice): {
    settings: AgentSettings;
    etag: string;
  } {
    const settings: AgentSettings = {
      ...DEFAULT_AGENT_SETTINGS,
      ...(device.settingsOverride as Partial<AgentSettings> | undefined),
    };
    const etag =
      '"' +
      createHash("sha1").update(JSON.stringify(settings)).digest("hex") +
      '"';
    return { settings, etag };
  }

  public static getSettingsService = async (
    device: IDevice,
    ifNoneMatch?: string
  ): Promise<{ notModified: boolean; settings?: AgentSettings; etag: string }> => {
    const { settings, etag } = AgentServices.resolveSettings(device);
    if (ifNoneMatch && ifNoneMatch === etag) {
      return { notModified: true, etag };
    }
    return { notModified: false, settings, etag };
  };

  // ── Activity ingest ─────────────────────────────────────────────────────────
  public static ingestActivityService = async (
    device: IDevice,
    batch: ActivityBatchInput
  ) => {
    const result = await AgentRepo.bulkUpsertSegments(
      device.id,
      String(device.userId),
      batch.segments
    );
    await AgentRepo.touchDevice(device.id);
    return {
      received: batch.segments.length,
      stored: result.upserted,
      duplicates: result.matched,
    };
  };

  // ── Screenshot presign ────────────────────────────────────────────────────────
  public static presignScreenshotsService = async (
    device: IDevice,
    body: PresignRequestInput
  ): Promise<{ items: PresignItemResult[] }> => {
    if (!isR2Configured()) {
      throw HttpError.databaseError("Screenshot storage is not configured");
    }

    const expiresAt = Date.now() + PRESIGN_TTL_SEC * 1000;

    const items = await Promise.all(
      body.items.map(async (item) => {
        const objectKey = AgentServices.buildObjectKey(
          String(device.userId),
          device.id,
          item.capturedAtUtc,
          item.clientScreenshotId
        );
        const uploadUrl = await presignPut({
          objectKey,
          contentType: item.contentType ?? "image/webp",
          expiresInSeconds: PRESIGN_TTL_SEC,
        });
        return {
          clientScreenshotId: item.clientScreenshotId,
          objectKey,
          uploadUrl,
          expiresAt,
        };
      })
    );

    return { items };
  };

  // Deterministic key so a retried PUT overwrites the same object (idempotent).
  private static buildObjectKey(
    userId: string,
    deviceId: string,
    capturedAtUtc: number,
    clientScreenshotId: string
  ): string {
    const d = new Date(capturedAtUtc);
    const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getUTCDate()).padStart(2, "0")}`;
    // clientScreenshotId already encodes outboxId + displayIndex and is filesystem-safe.
    const safeId = clientScreenshotId.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return `screenshots/${userId}/${deviceId}/${day}/${safeId}.webp`;
  }

  // ── Screenshot confirm ──────────────────────────────────────────────────────
  public static confirmScreenshotsService = async (
    device: IDevice,
    body: ConfirmRequestInput
  ) => {
    if (!isR2Configured()) {
      throw HttpError.databaseError("Screenshot storage is not configured");
    }

    const verified: any[] = [];
    const rejected: { clientScreenshotId: string; reason: string }[] = [];

    // Verify each object actually landed in R2 with the expected size before recording.
    // A missing/short object becomes a retryable rejection, not a phantom confirm.
    await Promise.all(
      body.items.map(async (item) => {
        const head = await headObject(item.objectKey);
        if (!head.exists) {
          rejected.push({
            clientScreenshotId: item.clientScreenshotId,
            reason: "object-not-found",
          });
          return;
        }
        if (
          typeof head.contentLength === "number" &&
          head.contentLength !== item.bytes
        ) {
          rejected.push({
            clientScreenshotId: item.clientScreenshotId,
            reason: "size-mismatch",
          });
          return;
        }
        verified.push({
          ...item,
          bucket: appConfig.r2.bucket,
          etag: item.etag || head.etag,
        });
      })
    );

    const result = await AgentRepo.bulkUpsertScreenshots(
      device.id,
      String(device.userId),
      verified
    );
    await AgentRepo.touchDevice(device.id);

    return {
      confirmed: result.upserted,
      duplicates: result.matched,
      rejected,
    };
  };

  // ── Events ───────────────────────────────────────────────────────────────────
  public static recordEventsService = async (
    device: IDevice,
    body: AgentEventsInput
  ) => {
    const result = await AgentRepo.insertEvents(
      device.id,
      String(device.userId),
      body.events
    );
    await AgentRepo.touchDevice(device.id);
    return result;
  };
}

export default AgentServices;
