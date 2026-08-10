import Joi from "joi";

// Device registration (called with a user JWT).
export const registerDeviceValidation = Joi.object({
  hardwareId: Joi.string().min(4).max(200).required(),
  name: Joi.string().min(1).max(200).required(),
  platform: Joi.string().min(1).max(50).required(),
  osVersion: Joi.string().allow("").max(200).default(""),
  arch: Joi.string().allow("").max(50).default(""),
  cpuModel: Joi.string().allow("").max(200).default(""),
  cpuCount: Joi.number().integer().min(0).default(0),
  totalMemBytes: Joi.number().min(0).default(0),
  sessionType: Joi.string()
    .valid("x11", "wayland", "win32", "macos", "unknown")
    .default("unknown"),
  degraded: Joi.array().items(Joi.string()).default([]),
  weakCredentialStorage: Joi.boolean().default(false),
  agentVersion: Joi.string().allow("").max(50).default(""),
});

const segmentSchema = Joi.object({
  clientSegmentId: Joi.string().min(1).max(64).required(),
  startedAtUtc: Joi.number().required(),
  endedAtUtc: Joi.number().required(),
  durationMs: Joi.number().min(0).required(),
  startedAtMono: Joi.number().default(0),
  bootId: Joi.string().allow("").default(""),
  tzOffsetMinutes: Joi.number().default(0),
  tzName: Joi.string().allow("").default(""),
  state: Joi.string()
    .valid("active", "idle", "paused", "locked", "suspended", "discarded")
    .required(),
  app: Joi.object({
    name: Joi.string().allow(""),
    exePath: Joi.string().allow(""),
    processName: Joi.string().allow(""),
  }).default({}),
  window: Joi.object({
    title: Joi.string().allow(""),
    urlSource: Joi.string()
      .valid("uia", "atspi", "title-fallback", "none")
      .default("none"),
    url: Joi.string().allow(""),
    domain: Joi.string().allow(""),
    pageTitle: Joi.string().allow(""),
  }).default({}),
  displayIndex: Joi.number().integer().default(0),
  isBrowser: Joi.boolean().default(false),
  input: Joi.object({
    keyCount: Joi.number().integer().min(0).default(0),
    mouseClickCount: Joi.number().integer().min(0).default(0),
    mouseMoveCount: Joi.number().integer().min(0).default(0),
    activeSeconds: Joi.number().min(0).default(0),
  }).default({}),
  activityPercent: Joi.number().min(0).max(100).default(0),
  capture: Joi.object({
    sessionType: Joi.string().default("unknown"),
    degraded: Joi.array().items(Joi.string()).default([]),
  }).default({}),
  agentVersion: Joi.string().allow("").default(""),
});

export const activityBatchValidation = Joi.object({
  clientBatchId: Joi.string().min(1).max(64).required(),
  segments: Joi.array().items(segmentSchema).min(1).max(500).required(),
});

export const presignValidation = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        clientScreenshotId: Joi.string().min(1).max(80).required(),
        capturedAtUtc: Joi.number().required(),
        displayIndex: Joi.number().integer().min(0).required(),
        isActiveDisplay: Joi.boolean().default(false),
        bytes: Joi.number().integer().min(1).max(50_000_000).required(),
        sha256: Joi.string().length(64).required(),
        contentType: Joi.string().default("image/webp"),
      })
    )
    .min(1)
    .max(16)
    .required(),
});

export const confirmValidation = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        clientScreenshotId: Joi.string().min(1).max(80).required(),
        objectKey: Joi.string().min(1).max(500).required(),
        etag: Joi.string().allow(""),
        bytes: Joi.number().integer().min(1).required(),
        sha256: Joi.string().length(64).required(),
        contentType: Joi.string().default("image/webp"),
        capturedAtUtc: Joi.number().required(),
        displayIndex: Joi.number().integer().min(0).required(),
        isActiveDisplay: Joi.boolean().default(false),
        captureGroupId: Joi.string().allow("").default(""),
        activitySegmentId: Joi.string().allow(""),
        keyCount: Joi.number().integer().min(0),
        mouseCount: Joi.number().integer().min(0),
      })
    )
    .min(1)
    .max(16)
    .required(),
});

export const agentEventsValidation = Joi.object({
  events: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().min(1).max(80).required(),
        atUtc: Joi.number().required(),
        data: Joi.object().unknown(true).default({}),
      })
    )
    .min(1)
    .max(100)
    .required(),
});
