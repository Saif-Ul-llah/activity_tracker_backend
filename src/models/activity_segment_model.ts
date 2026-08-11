import { Schema, model, models, Document } from "mongoose";

export type SegmentState =
  | "active"
  | "idle"
  | "paused"
  | "locked"
  | "suspended"
  | "discarded";

export type UrlSource =
  | "uia"
  | "atspi"
  | "title-fallback"
  | "browser-ext"
  | "none";

export interface IActivitySegment extends Document {
  id: string;
  deviceId: string;
  userId: string;
  // Client-generated ULID; the idempotency key that makes retried batches safe.
  clientSegmentId: string;

  startedAtUtc: Date;
  endedAtUtc: Date;
  // Authoritative duration, computed by the agent from a monotonic clock (never
  // endedAt - startedAt), so clock changes cannot corrupt it.
  durationMs: number;
  startedAtMono: number;
  bootId: string;
  tzOffsetMinutes: number;
  tzName: string;

  state: SegmentState;

  app: {
    name?: string;
    exePath?: string;
    processName?: string;
  };
  window: {
    title?: string;
    urlSource: UrlSource;
    url?: string;
    domain?: string;
    pageTitle?: string;
  };
  displayIndex: number;
  isBrowser: boolean;

  input: {
    keyCount: number;
    mouseClickCount: number;
    mouseMoveCount: number;
    activeSeconds: number;
  };
  activityPercent: number;

  capture: {
    sessionType: string;
    degraded: string[];
  };
  agentVersion: string;
  receivedAt: Date;
}

const activitySegmentSchema = new Schema<IActivitySegment>(
  {
    deviceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    clientSegmentId: { type: String, required: true },

    startedAtUtc: { type: Date, required: true },
    endedAtUtc: { type: Date, required: true },
    durationMs: { type: Number, required: true },
    startedAtMono: { type: Number, default: 0 },
    bootId: { type: String, default: "" },
    tzOffsetMinutes: { type: Number, default: 0 },
    tzName: { type: String, default: "" },

    state: {
      type: String,
      enum: ["active", "idle", "paused", "locked", "suspended", "discarded"],
      required: true,
    },

    app: {
      name: { type: String },
      exePath: { type: String },
      processName: { type: String },
    },
    window: {
      title: { type: String },
      urlSource: {
        type: String,
        enum: ["uia", "atspi", "title-fallback", "browser-ext", "none"],
        default: "none",
      },
      url: { type: String },
      domain: { type: String },
      pageTitle: { type: String },
    },
    displayIndex: { type: Number, default: 0 },
    isBrowser: { type: Boolean, default: false },

    input: {
      keyCount: { type: Number, default: 0 },
      mouseClickCount: { type: Number, default: 0 },
      mouseMoveCount: { type: Number, default: 0 },
      activeSeconds: { type: Number, default: 0 },
    },
    activityPercent: { type: Number, default: 0 },

    capture: {
      sessionType: { type: String, default: "unknown" },
      degraded: { type: [String], default: [] },
    },
    agentVersion: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  }
);

// Idempotency: a retried upload of the same segment is a no-op upsert, never a duplicate.
activitySegmentSchema.index(
  { deviceId: 1, clientSegmentId: 1 },
  { unique: true }
);
// Common dashboard query: a user's timeline over a time range.
activitySegmentSchema.index({ userId: 1, startedAtUtc: 1 });

const ActivitySegmentModel =
  models.ActivitySegment ||
  model<IActivitySegment>("ActivitySegment", activitySegmentSchema);

export { ActivitySegmentModel };
