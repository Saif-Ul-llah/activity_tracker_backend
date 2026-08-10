import { Schema, model, models, Document } from "mongoose";

export interface IScreenshot extends Document {
  id: string;
  deviceId: string;
  userId: string;
  // Client-generated idempotency key (outboxId + displayIndex).
  clientScreenshotId: string;

  // R2 object location.
  bucket: string;
  objectKey: string;
  etag?: string;
  bytes: number;
  sha256: string;
  contentType: string;

  capturedAtUtc: Date;
  displayIndex: number;
  isActiveDisplay: boolean;
  captureGroupId: string; // ties per-display shots of one capture moment together

  // Optional linkage / context.
  activitySegmentId?: string;
  keyCount?: number;
  mouseCount?: number;

  receivedAt: Date;
}

const screenshotSchema = new Schema<IScreenshot>(
  {
    deviceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    clientScreenshotId: { type: String, required: true },

    bucket: { type: String, required: true },
    objectKey: { type: String, required: true },
    etag: { type: String },
    bytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    contentType: { type: String, default: "image/webp" },

    capturedAtUtc: { type: Date, required: true },
    displayIndex: { type: Number, default: 0 },
    isActiveDisplay: { type: Boolean, default: false },
    captureGroupId: { type: String, default: "" },

    activitySegmentId: { type: String },
    keyCount: { type: Number },
    mouseCount: { type: Number },

    receivedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  }
);

// Idempotency: a retried confirm upserts the same row rather than duplicating.
screenshotSchema.index({ deviceId: 1, clientScreenshotId: 1 }, { unique: true });
// Timeline query.
screenshotSchema.index({ userId: 1, capturedAtUtc: 1 });

const ScreenshotModel =
  models.Screenshot || model<IScreenshot>("Screenshot", screenshotSchema);

export { ScreenshotModel };
