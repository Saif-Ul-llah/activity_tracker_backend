import { Schema, model, models, Document } from "mongoose";

export type SessionType = "x11" | "wayland" | "win32" | "macos" | "unknown";

export interface IDevice extends Document {
  id: string;
  userId: string;
  // Stable hardware fingerprint sent by the agent; identifies a physical machine so
  // re-registration reuses the same device document instead of creating duplicates.
  hardwareId: string;
  name: string; // hostname
  platform: string; // 'win32' | 'linux' | ...
  osVersion: string;
  arch: string;
  cpuModel: string;
  cpuCount: number;
  totalMemBytes: number;
  sessionType: SessionType;
  // Honesty flags reported by the agent (e.g. wayland degraded tracking).
  capabilities: {
    degraded: string[];
    weakCredentialStorage: boolean;
  };
  agentVersion: string;
  // Active token id — the revocation handle. A device token is valid only while its
  // `tokenId` claim equals this value and `revoked` is false. Rotating this or setting
  // `revoked` immediately invalidates the issued token fleet-wide.
  tokenId: string;
  revoked: boolean;
  // Optional per-device overrides of the org/global agent settings.
  settingsOverride?: Record<string, unknown>;
  lastSeenAt?: Date;
  createdAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    userId: { type: String, required: true, index: true },
    hardwareId: { type: String, required: true },
    name: { type: String, required: true },
    platform: { type: String, required: true },
    osVersion: { type: String, default: "" },
    arch: { type: String, default: "" },
    cpuModel: { type: String, default: "" },
    cpuCount: { type: Number, default: 0 },
    totalMemBytes: { type: Number, default: 0 },
    sessionType: {
      type: String,
      enum: ["x11", "wayland", "win32", "macos", "unknown"],
      default: "unknown",
    },
    capabilities: {
      degraded: { type: [String], default: [] },
      weakCredentialStorage: { type: Boolean, default: false },
    },
    agentVersion: { type: String, default: "" },
    tokenId: { type: String, required: true },
    revoked: { type: Boolean, default: false },
    settingsOverride: { type: Schema.Types.Mixed },
    lastSeenAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  }
);

// One device document per (user, physical machine).
deviceSchema.index({ userId: 1, hardwareId: 1 }, { unique: true });

const DeviceModel = models.Device || model<IDevice>("Device", deviceSchema);

export { DeviceModel };
