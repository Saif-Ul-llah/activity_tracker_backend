import {
  DeviceModel,
  ActivitySegmentModel,
  ScreenshotModel,
  AgentEventModel,
} from "../../imports";
import type { IDevice } from "../../models/device_model";

class AgentRepo {
  // Upsert a device by (userId, hardwareId). Re-registration of the same machine
  // reuses the document and rotates the tokenId (invalidating any prior token).
  public static upsertDevice = async (
    userId: string,
    hardwareId: string,
    facts: Partial<IDevice>,
    tokenId: string
  ) => {
    return DeviceModel.findOneAndUpdate(
      { userId, hardwareId },
      {
        $set: { ...facts, tokenId, revoked: false, lastSeenAt: new Date() },
        $setOnInsert: { userId, hardwareId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  };

  public static findDeviceById = async (deviceId: string) => {
    return DeviceModel.findById(deviceId);
  };

  public static touchDevice = async (deviceId: string) => {
    return DeviceModel.updateOne(
      { _id: deviceId },
      { $set: { lastSeenAt: new Date() } }
    );
  };

  // Idempotent activity upload. Each segment upserts on its unique
  // (deviceId, clientSegmentId); a replayed batch changes nothing.
  public static bulkUpsertSegments = async (
    deviceId: string,
    userId: string,
    segments: any[]
  ): Promise<{ upserted: number; matched: number }> => {
    if (segments.length === 0) return { upserted: 0, matched: 0 };

    const ops = segments.map((s) => {
      const doc = {
        deviceId,
        userId,
        clientSegmentId: s.clientSegmentId,
        startedAtUtc: new Date(s.startedAtUtc),
        endedAtUtc: new Date(s.endedAtUtc),
        durationMs: s.durationMs,
        startedAtMono: s.startedAtMono ?? 0,
        bootId: s.bootId ?? "",
        tzOffsetMinutes: s.tzOffsetMinutes ?? 0,
        tzName: s.tzName ?? "",
        state: s.state,
        app: s.app ?? {},
        window: { urlSource: "none", ...(s.window ?? {}) },
        displayIndex: s.displayIndex ?? 0,
        isBrowser: s.isBrowser ?? false,
        input: s.input ?? {},
        activityPercent: s.activityPercent ?? 0,
        capture: s.capture ?? {},
        agentVersion: s.agentVersion ?? "",
      };
      return {
        updateOne: {
          filter: { deviceId, clientSegmentId: s.clientSegmentId },
          // Segments are immutable once stored: only insert, never mutate on replay.
          update: { $setOnInsert: doc },
          upsert: true,
        },
      };
    });

    const res = await ActivitySegmentModel.bulkWrite(ops, { ordered: false });
    return {
      upserted: res.upsertedCount ?? 0,
      matched: res.matchedCount ?? 0,
    };
  };

  // Idempotent screenshot confirm. Upsert on (deviceId, clientScreenshotId).
  public static bulkUpsertScreenshots = async (
    deviceId: string,
    userId: string,
    items: any[]
  ): Promise<{ upserted: number; matched: number }> => {
    if (items.length === 0) return { upserted: 0, matched: 0 };

    const ops = items.map((i) => {
      const doc = {
        deviceId,
        userId,
        clientScreenshotId: i.clientScreenshotId,
        bucket: i.bucket,
        objectKey: i.objectKey,
        etag: i.etag,
        bytes: i.bytes,
        sha256: i.sha256,
        contentType: i.contentType ?? "image/webp",
        capturedAtUtc: new Date(i.capturedAtUtc),
        displayIndex: i.displayIndex ?? 0,
        isActiveDisplay: i.isActiveDisplay ?? false,
        captureGroupId: i.captureGroupId ?? "",
        activitySegmentId: i.activitySegmentId,
        keyCount: i.keyCount,
        mouseCount: i.mouseCount,
      };
      return {
        updateOne: {
          filter: { deviceId, clientScreenshotId: i.clientScreenshotId },
          update: { $setOnInsert: doc },
          upsert: true,
        },
      };
    });

    const res = await ScreenshotModel.bulkWrite(ops, { ordered: false });
    return {
      upserted: res.upsertedCount ?? 0,
      matched: res.matchedCount ?? 0,
    };
  };

  public static insertEvents = async (
    deviceId: string,
    userId: string,
    events: { type: string; atUtc: number; data?: Record<string, unknown> }[]
  ) => {
    if (events.length === 0) return { inserted: 0 };
    const docs = events.map((e) => ({
      deviceId,
      userId,
      type: e.type,
      atUtc: new Date(e.atUtc),
      data: e.data ?? {},
    }));
    const res = await AgentEventModel.insertMany(docs, { ordered: false });
    return { inserted: res.length };
  };
}

export default AgentRepo;
