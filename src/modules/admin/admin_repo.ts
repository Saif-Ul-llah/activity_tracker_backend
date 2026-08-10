import {
  ActivitySegmentModel,
  ScreenshotModel,
  DeviceModel,
  AgentEventModel,
  UserModel,
} from "../../imports";
import {
  getGlobalSettings,
  AppSettingModel,
} from "../../models/app_setting_model";

export interface RangeFilter {
  from: Date;
  to: Date;
  userId?: string;
  deviceId?: string;
}

function baseMatch(f: RangeFilter): Record<string, unknown> {
  const m: Record<string, unknown> = {
    startedAtUtc: { $gte: f.from, $lte: f.to },
  };
  if (f.userId) m.userId = f.userId;
  if (f.deviceId) m.deviceId = f.deviceId;
  return m;
}

class AdminRepo {
  // ── Aggregations for the overview ─────────────────────────────────────────────
  static stateBreakdown(f: RangeFilter) {
    return ActivitySegmentModel.aggregate([
      { $match: baseMatch(f) },
      {
        $group: {
          _id: "$state",
          durationMs: { $sum: "$durationMs" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, state: "$_id", durationMs: 1, count: 1 } },
    ]);
  }

  static topApps(f: RangeFilter, limit = 10) {
    return ActivitySegmentModel.aggregate([
      { $match: { ...baseMatch(f), state: "active" } },
      {
        $group: {
          _id: { $ifNull: ["$app.name", "unknown"] },
          durationMs: { $sum: "$durationMs" },
          keyCount: { $sum: "$input.keyCount" },
          mouseClicks: { $sum: "$input.mouseClickCount" },
        },
      },
      { $sort: { durationMs: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          app: "$_id",
          durationMs: 1,
          keyCount: 1,
          mouseClicks: 1,
        },
      },
    ]);
  }

  // Timeline bucketed by hour or day, split by state (for a stacked area chart).
  static timeline(f: RangeFilter, unit: "hour" | "day") {
    return ActivitySegmentModel.aggregate([
      { $match: baseMatch(f) },
      {
        $group: {
          _id: {
            bucket: { $dateTrunc: { date: "$startedAtUtc", unit } },
            state: "$state",
          },
          durationMs: { $sum: "$durationMs" },
        },
      },
      {
        $project: {
          _id: 0,
          bucket: "$_id.bucket",
          state: "$_id.state",
          durationMs: 1,
        },
      },
      { $sort: { bucket: 1 } },
    ]);
  }

  // Activity heatmap: day-of-week (1-7) x hour-of-day (0-23), summed active ms.
  static heatmap(f: RangeFilter) {
    return ActivitySegmentModel.aggregate([
      { $match: { ...baseMatch(f), state: "active" } },
      {
        $group: {
          _id: {
            dow: { $dayOfWeek: "$startedAtUtc" },
            hour: { $hour: "$startedAtUtc" },
          },
          durationMs: { $sum: "$durationMs" },
        },
      },
      {
        $project: {
          _id: 0,
          dow: "$_id.dow",
          hour: "$_id.hour",
          durationMs: 1,
        },
      },
    ]);
  }

  static async avgActivityPercent(f: RangeFilter): Promise<number> {
    const r = await ActivitySegmentModel.aggregate([
      { $match: { ...baseMatch(f), state: "active" } },
      { $group: { _id: null, avg: { $avg: "$activityPercent" } } },
    ]);
    return r[0]?.avg ?? 0;
  }

  static async activeDeviceIds(f: RangeFilter): Promise<string[]> {
    return ActivitySegmentModel.distinct("deviceId", baseMatch(f));
  }

  static countScreenshots(f: RangeFilter) {
    const m: Record<string, unknown> = {
      capturedAtUtc: { $gte: f.from, $lte: f.to },
    };
    if (f.userId) m.userId = f.userId;
    if (f.deviceId) m.deviceId = f.deviceId;
    return ScreenshotModel.countDocuments(m);
  }

  static countSegments(f: RangeFilter) {
    return ActivitySegmentModel.countDocuments(baseMatch(f));
  }

  static countDevices() {
    return DeviceModel.countDocuments({});
  }

  static countUsers() {
    return UserModel.countDocuments({});
  }

  // ── Lists ─────────────────────────────────────────────────────────────────────
  static async listUsers() {
    const users = await UserModel.find(
      {},
      "email fullName role IsActive createdAt phoneNumber"
    ).lean();
    const counts = await DeviceModel.aggregate([
      { $group: { _id: "$userId", devices: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c: any) => [String(c._id), c.devices]));
    return users.map((u: any) => ({
      id: String(u._id),
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.IsActive,
      createdAt: u.createdAt,
      deviceCount: map.get(String(u._id)) ?? 0,
    }));
  }

  static async listDevices(todayFrom: Date) {
    const devices = await DeviceModel.find({}).lean();
    // Active ms today per device.
    const today = await ActivitySegmentModel.aggregate([
      { $match: { startedAtUtc: { $gte: todayFrom }, state: "active" } },
      { $group: { _id: "$deviceId", activeMs: { $sum: "$durationMs" } } },
    ]);
    const map = new Map(today.map((t: any) => [String(t._id), t.activeMs]));
    return devices.map((d: any) => ({
      id: String(d._id),
      userId: String(d.userId),
      name: d.name,
      platform: d.platform,
      osVersion: d.osVersion,
      sessionType: d.sessionType,
      degraded: d.capabilities?.degraded ?? [],
      agentVersion: d.agentVersion,
      revoked: d.revoked,
      lastSeenAt: d.lastSeenAt,
      activeMsToday: map.get(String(d._id)) ?? 0,
    }));
  }

  static async listSegments(f: RangeFilter, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ActivitySegmentModel.find(baseMatch(f))
        .sort({ startedAtUtc: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivitySegmentModel.countDocuments(baseMatch(f)),
    ]);
    return { items, total };
  }

  static async listScreenshots(f: RangeFilter, page: number, limit: number) {
    const m: Record<string, unknown> = {
      capturedAtUtc: { $gte: f.from, $lte: f.to },
    };
    if (f.userId) m.userId = f.userId;
    if (f.deviceId) m.deviceId = f.deviceId;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ScreenshotModel.find(m)
        .sort({ capturedAtUtc: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ScreenshotModel.countDocuments(m),
    ]);
    return { items, total };
  }

  // ── User management ───────────────────────────────────────────────────────────
  static findUserByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() });
  }

  static async createUser(payload: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    role: string;
  }) {
    const u = await UserModel.create(payload);
    return {
      id: String(u._id),
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.IsActive,
      createdAt: u.createdAt,
      deviceCount: 0,
    };
  }

  static async updateUser(
    userId: string,
    changes: { fullName?: string; role?: string; isActive?: boolean; phoneNumber?: string }
  ) {
    const set: Record<string, unknown> = {};
    if (changes.fullName !== undefined) set.fullName = changes.fullName;
    if (changes.role !== undefined) set.role = changes.role;
    if (changes.isActive !== undefined) set.IsActive = changes.isActive;
    if (changes.phoneNumber !== undefined) set.phoneNumber = changes.phoneNumber;
    return UserModel.findByIdAndUpdate(userId, { $set: set }, { new: true }).lean();
  }

  // ── R2 storage + global settings ──────────────────────────────────────────────
  static async r2Usage(): Promise<{ usedBytes: number; count: number }> {
    const r = await ScreenshotModel.aggregate([
      { $group: { _id: null, bytes: { $sum: "$bytes" }, count: { $sum: 1 } } },
    ]);
    return { usedBytes: r[0]?.bytes ?? 0, count: r[0]?.count ?? 0 };
  }

  // Per-day storage growth (last 30 days) for a trend chart.
  static storageByDay() {
    return ScreenshotModel.aggregate([
      {
        $group: {
          _id: { $dateTrunc: { date: "$capturedAtUtc", unit: "day" } },
          bytes: { $sum: "$bytes" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, day: "$_id", bytes: 1, count: 1 } },
      { $sort: { day: 1 } },
      { $limit: 60 },
    ]);
  }

  // Returns the object keys + ids of screenshots matching a delete selection.
  static async screenshotsToDelete(sel: {
    ids?: string[];
    deviceId?: string;
    userId?: string;
    before?: number; // ms epoch — delete captured before this
    all?: boolean;
  }): Promise<{ ids: string[]; objectKeys: string[] }> {
    const m: Record<string, unknown> = {};
    if (sel.ids && sel.ids.length) m._id = { $in: sel.ids };
    if (sel.deviceId) m.deviceId = sel.deviceId;
    if (sel.userId) m.userId = sel.userId;
    if (sel.before) m.capturedAtUtc = { $lt: new Date(sel.before) };
    // Guard: require at least one selector unless `all` is explicitly set.
    if (!sel.all && Object.keys(m).length === 0) return { ids: [], objectKeys: [] };
    const docs = await ScreenshotModel.find(m, "objectKey").lean();
    return {
      ids: docs.map((d: any) => String(d._id)),
      objectKeys: docs.map((d: any) => d.objectKey),
    };
  }

  static async deleteScreenshotDocs(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const r = await ScreenshotModel.deleteMany({ _id: { $in: ids } });
    return r.deletedCount ?? 0;
  }

  static getGlobalSettings() {
    return getGlobalSettings();
  }

  static async updateGlobalSettings(changes: {
    screenshotUploadEnabled?: boolean;
    r2LimitBytes?: number;
  }) {
    const set: Record<string, unknown> = {};
    if (changes.screenshotUploadEnabled !== undefined)
      set.screenshotUploadEnabled = changes.screenshotUploadEnabled;
    if (changes.r2LimitBytes !== undefined) set.r2LimitBytes = changes.r2LimitBytes;
    return AppSettingModel.findOneAndUpdate(
      { key: "global" },
      { $set: set, $setOnInsert: { key: "global" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  static async setDeviceRevoked(deviceId: string, revoked: boolean) {
    return DeviceModel.findByIdAndUpdate(
      deviceId,
      { $set: { revoked } },
      { new: true }
    ).lean();
  }

  static findUserById(userId: string) {
    return UserModel.findById(userId).lean();
  }

  // Object keys of a user's screenshots (for R2 cleanup before cascade delete).
  static async screenshotKeysForUser(userId: string): Promise<string[]> {
    const docs = await ScreenshotModel.find({ userId }, "objectKey").lean();
    return docs.map((d: any) => d.objectKey);
  }

  // Removes a user and everything belonging to them (devices, segments,
  // screenshot rows, events). R2 objects are cleared by the service beforehand.
  static async deleteUserCascade(userId: string) {
    const [user, devices, segments, screenshots, events] = await Promise.all([
      UserModel.deleteOne({ _id: userId }),
      DeviceModel.deleteMany({ userId }),
      ActivitySegmentModel.deleteMany({ userId }),
      ScreenshotModel.deleteMany({ userId }),
      AgentEventModel.deleteMany({ userId }),
    ]);
    return {
      user: user.deletedCount ?? 0,
      devices: devices.deletedCount ?? 0,
      segments: segments.deletedCount ?? 0,
      screenshots: screenshots.deletedCount ?? 0,
      events: events.deletedCount ?? 0,
    };
  }

  // Clear activity history by filter: device, user, time range, and/or app name.
  static async deleteActivitySegments(sel: {
    deviceId?: string;
    userId?: string;
    from?: number;
    to?: number;
    app?: string;
    all?: boolean;
  }): Promise<number> {
    const m: Record<string, unknown> = {};
    if (sel.deviceId) m.deviceId = sel.deviceId;
    if (sel.userId) m.userId = sel.userId;
    if (sel.app) m["app.name"] = sel.app;
    if (sel.from || sel.to) {
      const range: Record<string, Date> = {};
      if (sel.from) range.$gte = new Date(sel.from);
      if (sel.to) range.$lte = new Date(sel.to);
      m.startedAtUtc = range;
    }
    // Guard: never delete the whole collection unless `all` is explicit.
    if (!sel.all && Object.keys(m).length === 0) return 0;
    const r = await ActivitySegmentModel.deleteMany(m);
    return r.deletedCount ?? 0;
  }

  static async listEvents(f: RangeFilter, page: number, limit: number) {
    const m: Record<string, unknown> = {
      atUtc: { $gte: f.from, $lte: f.to },
    };
    if (f.deviceId) m.deviceId = f.deviceId;
    if (f.userId) m.userId = f.userId;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AgentEventModel.find(m).sort({ atUtc: -1 }).skip(skip).limit(limit).lean(),
      AgentEventModel.countDocuments(m),
    ]);
    return { items, total };
  }
}

export default AdminRepo;
