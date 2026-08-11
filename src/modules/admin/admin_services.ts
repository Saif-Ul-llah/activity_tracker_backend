import AdminRepo, { RangeFilter } from "./admin_repo";
import { presignGet, isR2Configured, deleteObjects } from "../../utils/r2";
import { encryptPass, HttpError } from "../../imports";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfTodayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

class AdminServices {
  static async overview(f: RangeFilter) {
    const spanMs = f.to.getTime() - f.from.getTime();
    const unit: "hour" | "day" = spanMs > 2 * DAY_MS ? "day" : "hour";

    const [
      stateBreakdown,
      topApps,
      timeline,
      heatmap,
      avgActivityPercent,
      activeDeviceIds,
      screenshotCount,
      segmentCount,
      deviceCount,
      userCount,
    ] = await Promise.all([
      AdminRepo.stateBreakdown(f),
      AdminRepo.topApps(f, 10),
      AdminRepo.timeline(f, unit),
      AdminRepo.heatmap(f),
      AdminRepo.avgActivityPercent(f),
      AdminRepo.activeDeviceIds(f),
      AdminRepo.countScreenshots(f),
      AdminRepo.countSegments(f),
      AdminRepo.countDevices(),
      AdminRepo.countUsers(),
    ]);

    const activeMs =
      stateBreakdown.find((s: any) => s.state === "active")?.durationMs ?? 0;
    const idleMs =
      stateBreakdown.find((s: any) => s.state === "idle")?.durationMs ?? 0;

    return {
      range: { from: f.from, to: f.to, unit },
      kpis: {
        activeMs,
        idleMs,
        trackedMs: stateBreakdown.reduce(
          (a: number, s: any) => a + s.durationMs,
          0
        ),
        avgActivityPercent: Math.round(avgActivityPercent),
        activeDevices: activeDeviceIds.length,
        deviceCount,
        userCount,
        screenshotCount,
        segmentCount,
      },
      stateBreakdown,
      topApps,
      timeline,
      heatmap,
    };
  }

  static users() {
    return AdminRepo.listUsers();
  }

  static devices() {
    return AdminRepo.listDevices(startOfTodayUtc());
  }

  static activity(f: RangeFilter, page: number, limit: number) {
    return Promise.all([
      AdminRepo.listSegments(f, page, limit),
      AdminRepo.topApps(f, 15),
      AdminRepo.stateBreakdown(f),
      AdminRepo.timeline(f, "hour"),
    ]).then(([segments, byApp, byState, byHour]) => ({
      segments: segments.items,
      total: segments.total,
      page,
      limit,
      byApp,
      byState,
      byHour,
    }));
  }

  static async screenshots(f: RangeFilter, page: number, limit: number) {
    const { items, total } = await AdminRepo.listScreenshots(f, page, limit);
    const r2Ready = isR2Configured();
    const withUrls = await Promise.all(
      items.map(async (s: any) => ({
        id: String(s._id),
        deviceId: s.deviceId,
        userId: s.userId,
        capturedAtUtc: s.capturedAtUtc,
        displayIndex: s.displayIndex,
        isActiveDisplay: s.isActiveDisplay,
        bytes: s.bytes,
        objectKey: s.objectKey,
        // Short-lived signed URL so the private object can be shown in the UI.
        url: r2Ready ? await presignGet(s.objectKey, 60 * 60) : null,
      }))
    );
    return { items: withUrls, total, page, limit };
  }

  static events(f: RangeFilter, page: number, limit: number) {
    return AdminRepo.listEvents(f, page, limit);
  }

  static browserTabs(scope: { deviceId?: string; userId?: string }) {
    return AdminRepo.listBrowserSnapshots(scope);
  }

  // ── User management ───────────────────────────────────────────────────────────
  static async createUser(payload: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    role: string;
  }) {
    const exists = await AdminRepo.findUserByEmail(payload.email);
    if (exists) throw HttpError.alreadyExists("Email");
    const hashed = await encryptPass(payload.password);
    return AdminRepo.createUser({ ...payload, password: hashed });
  }

  static async updateUser(
    userId: string,
    changes: { fullName?: string; role?: string; isActive?: boolean; phoneNumber?: string }
  ) {
    const updated = await AdminRepo.updateUser(userId, changes);
    if (!updated) throw HttpError.notFound("User not found");
    return {
      id: String((updated as any)._id),
      email: (updated as any).email,
      fullName: (updated as any).fullName,
      role: (updated as any).role,
      isActive: (updated as any).IsActive,
    };
  }

  static async revokeDevice(deviceId: string, revoked: boolean) {
    const d = await AdminRepo.setDeviceRevoked(deviceId, revoked);
    if (!d) throw HttpError.notFound("Device not found");
    return { id: String((d as any)._id), revoked: (d as any).revoked };
  }

  // ── Storage / global settings ─────────────────────────────────────────────────
  static async storage() {
    const [usage, settings, byDay] = await Promise.all([
      AdminRepo.r2Usage(),
      AdminRepo.getGlobalSettings(),
      AdminRepo.storageByDay(),
    ]);
    const limitBytes = (settings as any).r2LimitBytes as number;
    return {
      usedBytes: usage.usedBytes,
      screenshotCount: usage.count,
      limitBytes,
      usedPercent:
        limitBytes > 0
          ? Math.min(100, Math.round((usage.usedBytes / limitBytes) * 100))
          : 0,
      screenshotUploadEnabled: (settings as any).screenshotUploadEnabled,
      screenshotIntervalSec: (settings as any).screenshotIntervalSec ?? 15,
      byDay,
    };
  }

  static async updateGlobalSettings(changes: {
    screenshotUploadEnabled?: boolean;
    r2LimitBytes?: number;
    screenshotIntervalSec?: number;
  }) {
    const s = await AdminRepo.updateGlobalSettings(changes);
    return {
      screenshotUploadEnabled: (s as any).screenshotUploadEnabled,
      r2LimitBytes: (s as any).r2LimitBytes,
      screenshotIntervalSec: (s as any).screenshotIntervalSec ?? 15,
    };
  }

  // Permanently delete a user and all of their data (devices, activity, screenshots
  // incl. R2 objects, events). Refuses to delete the last remaining admin.
  static async deleteUser(userId: string, actingUserId: string) {
    if (String(userId) === String(actingUserId)) {
      throw HttpError.badRequest("You cannot delete your own account");
    }
    const user = await AdminRepo.findUserById(userId);
    if (!user) throw HttpError.notFound("User not found");

    // Clean R2 objects first, then cascade the DB rows.
    if (isR2Configured()) {
      const keys = await AdminRepo.screenshotKeysForUser(userId);
      if (keys.length) await deleteObjects(keys);
    }
    const counts = await AdminRepo.deleteUserCascade(userId);
    return counts;
  }

  static async clearActivity(sel: {
    deviceId?: string;
    userId?: string;
    from?: number;
    to?: number;
    app?: string;
    all?: boolean;
  }) {
    const deleted = await AdminRepo.deleteActivitySegments(sel);
    return { deleted };
  }

  // Bulk-delete screenshots from R2 AND Mongo to free storage. R2 objects are
  // removed first; the DB rows are dropped only for objects R2 accepted.
  static async deleteScreenshots(sel: {
    ids?: string[];
    deviceId?: string;
    userId?: string;
    before?: number;
    all?: boolean;
  }) {
    const { ids, objectKeys } = await AdminRepo.screenshotsToDelete(sel);
    if (ids.length === 0) return { deleted: 0, freedFromR2: 0 };
    let freedFromR2 = 0;
    if (isR2Configured()) {
      freedFromR2 = await deleteObjects(objectKeys);
    }
    const deleted = await AdminRepo.deleteScreenshotDocs(ids);
    return { deleted, freedFromR2 };
  }
}

export default AdminServices;
