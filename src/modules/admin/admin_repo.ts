import {
  ActivitySegmentModel,
  ScreenshotModel,
  DeviceModel,
  AgentEventModel,
  UserModel,
} from "../../imports";

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
