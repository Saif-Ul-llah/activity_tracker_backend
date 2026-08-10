import type { SessionType } from "../../models/device_model";
import type {
  SegmentState,
  UrlSource,
} from "../../models/activity_segment_model";

// ── Registration ──────────────────────────────────────────────────────────────
export interface RegisterDeviceInput {
  hardwareId: string;
  name: string;
  platform: string;
  osVersion?: string;
  arch?: string;
  cpuModel?: string;
  cpuCount?: number;
  totalMemBytes?: number;
  sessionType?: SessionType;
  degraded?: string[];
  weakCredentialStorage?: boolean;
  agentVersion?: string;
}

// ── Server-controlled agent settings ──────────────────────────────────────────
export type UrlCaptureMode = "full" | "domain" | "off";

export interface AgentSettings {
  screenshotIntervalSec: number;
  idleThresholdSec: number;
  quotaBytes: number;
  urlCaptureMode: UrlCaptureMode;
  // App/domain patterns whose title+URL are redacted and screenshots skipped.
  blocklist: string[];
  uploadConcurrency: number;
  flushIntervalSec: number;
  screenshotNotify: boolean;
  allowUserPause: boolean;
  // When false, the agent keeps screenshots on the local machine instead of
  // uploading them to R2 (admin-controlled, e.g. when nearing the storage limit).
  screenshotUploadEnabled: boolean;
}

// ── Activity batch upload ─────────────────────────────────────────────────────
export interface ActivitySegmentInput {
  clientSegmentId: string;
  startedAtUtc: number; // ms epoch
  endedAtUtc: number; // ms epoch
  durationMs: number;
  startedAtMono?: number;
  bootId?: string;
  tzOffsetMinutes?: number;
  tzName?: string;
  state: SegmentState;
  app?: { name?: string; exePath?: string; processName?: string };
  window?: {
    title?: string;
    urlSource?: UrlSource;
    url?: string;
    domain?: string;
    pageTitle?: string;
  };
  displayIndex?: number;
  isBrowser?: boolean;
  input?: {
    keyCount?: number;
    mouseClickCount?: number;
    mouseMoveCount?: number;
    activeSeconds?: number;
  };
  activityPercent?: number;
  capture?: { sessionType?: string; degraded?: string[] };
  agentVersion?: string;
}

export interface ActivityBatchInput {
  clientBatchId: string;
  segments: ActivitySegmentInput[];
}

// ── Screenshot presign / confirm ──────────────────────────────────────────────
export interface PresignItemInput {
  clientScreenshotId: string;
  capturedAtUtc: number;
  displayIndex: number;
  isActiveDisplay?: boolean;
  bytes: number;
  sha256: string;
  contentType?: string;
}

export interface PresignRequestInput {
  items: PresignItemInput[];
}

export interface PresignItemResult {
  clientScreenshotId: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: number;
}

export interface ConfirmItemInput {
  clientScreenshotId: string;
  objectKey: string;
  etag?: string;
  bytes: number;
  sha256: string;
  contentType?: string;
  capturedAtUtc: number;
  displayIndex: number;
  isActiveDisplay?: boolean;
  captureGroupId?: string;
  activitySegmentId?: string;
  keyCount?: number;
  mouseCount?: number;
}

export interface ConfirmRequestInput {
  items: ConfirmItemInput[];
}

// ── Agent telemetry events ────────────────────────────────────────────────────
export interface AgentEventInput {
  type: string; // 'crash' | 'clock_jump' | 'quota_evicted' | 'degraded_mode' | ...
  atUtc: number;
  data?: Record<string, unknown>;
}

export interface AgentEventsInput {
  events: AgentEventInput[];
}
