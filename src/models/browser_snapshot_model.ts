import { Schema, model, models, Document } from "mongoose";

// Latest snapshot of a device's open browser tabs, one document per (device, browser).
// This is CURRENT state (last write wins) — not a history — so the admin panel can show
// every open tab as a clickable link. Historical URL visits live on activity segments.
export interface IBrowserTab {
  url: string;
  title: string;
  active: boolean;
  favIconUrl?: string;
}

export interface IBrowserSnapshot extends Document {
  deviceId: string;
  userId: string;
  browser: string; // chrome | edge | firefox | opera | vivaldi | …
  activeUrl: string;
  activeTitle: string;
  tabs: IBrowserTab[];
  tabCount: number;
  capturedAtUtc: Date;
  updatedAt: Date;
}

const browserTabSchema = new Schema<IBrowserTab>(
  {
    url: { type: String, required: true },
    title: { type: String, default: "" },
    active: { type: Boolean, default: false },
    favIconUrl: { type: String, default: "" },
  },
  { _id: false }
);

const browserSnapshotSchema = new Schema<IBrowserSnapshot>(
  {
    deviceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    browser: { type: String, required: true },
    activeUrl: { type: String, default: "" },
    activeTitle: { type: String, default: "" },
    tabs: { type: [browserTabSchema], default: [] },
    tabCount: { type: Number, default: 0 },
    capturedAtUtc: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    versionKey: false,
  }
);

// One current snapshot per browser per device.
browserSnapshotSchema.index({ deviceId: 1, browser: 1 }, { unique: true });

const BrowserSnapshotModel =
  models.BrowserSnapshot ||
  model<IBrowserSnapshot>("BrowserSnapshot", browserSnapshotSchema);

export { BrowserSnapshotModel };
