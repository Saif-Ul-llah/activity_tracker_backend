import { Schema, model, models, Document } from "mongoose";

// Singleton (key: "global") holding org-wide, admin-controllable settings that flow
// down to agents via GET /api/agent/settings and drive the admin dashboard.
export interface IAppSetting extends Document {
  key: string;
  // When false, agents STOP uploading screenshots to R2 and keep them on the local
  // machine (queued in their outbox) until re-enabled.
  screenshotUploadEnabled: boolean;
  // Soft cap for R2 screenshot storage (bytes), used for the dashboard gauge + alerts.
  r2LimitBytes: number;
  // How often agents capture a screenshot (seconds). Admin-controllable; flows to
  // agents via GET /api/agent/settings and applies live on their next capture cycle.
  screenshotIntervalSec: number;
  updatedAt: Date;
}

const appSettingSchema = new Schema<IAppSetting>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    screenshotUploadEnabled: { type: Boolean, default: true },
    r2LimitBytes: { type: Number, default: 10 * 1024 * 1024 * 1024 }, // 10 GB
    screenshotIntervalSec: { type: Number, default: 15 },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false }
);

const AppSettingModel =
  models.AppSetting || model<IAppSetting>("AppSetting", appSettingSchema);

// Always returns the singleton, creating it with defaults on first access.
export async function getGlobalSettings() {
  return AppSettingModel.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export { AppSettingModel };
