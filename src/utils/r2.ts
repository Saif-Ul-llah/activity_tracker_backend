import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { appConfig } from "../config/app_config";

// Cloudflare R2 is S3-compatible. Region must be "auto"; path-style addressing is
// required. The same client is reused across warm serverless invocations.

let cachedClient: S3Client | null = null;

export const isR2Configured = (): boolean =>
  Boolean(
    appConfig.r2.endpoint &&
      appConfig.r2.accessKeyId &&
      appConfig.r2.secretAccessKey &&
      appConfig.r2.bucket
  );

const getClient = (): S3Client => {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: appConfig.r2.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: appConfig.r2.accessKeyId,
      secretAccessKey: appConfig.r2.secretAccessKey,
    },
  });
  return cachedClient;
};

export interface PresignInput {
  objectKey: string;
  contentType: string;
  contentLength?: number;
  sha256Hex?: string;
  expiresInSeconds?: number;
}

/**
 * Returns a presigned PUT URL the agent uses to upload a screenshot directly to R2,
 * bypassing the backend. The PUT is a plain upload carrying only Content-Type, so the
 * agent stays simple. A screenshot document is created server-side only on confirm;
 * objects whose confirm never arrives (agent uninstalled mid-flight) are reaped by a
 * periodic reconciliation job that lists the bucket and drops objects with no
 * confirmed record. Keys are deterministic, so a retried PUT overwrites in place.
 */
export const presignPut = async (input: PresignInput): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: appConfig.r2.bucket,
    Key: input.objectKey,
    ContentType: input.contentType,
  });

  return getSignedUrl(getClient(), command, {
    expiresIn: input.expiresInSeconds ?? 15 * 60,
    // Sign content-type so the agent's PUT must match what it declared at presign.
    signableHeaders: new Set(["content-type"]),
  });
};

export interface HeadResult {
  exists: boolean;
  etag?: string;
  contentLength?: number;
}

/**
 * Verifies that an object the agent claims to have uploaded actually exists in R2,
 * with the expected size. This turns a silent partial/failed PUT into a retryable
 * confirm error instead of a phantom "confirmed" screenshot.
 */
export const headObject = async (objectKey: string): Promise<HeadResult> => {
  try {
    const out = await getClient().send(
      new HeadObjectCommand({
        Bucket: appConfig.r2.bucket,
        Key: objectKey,
      })
    );
    return {
      exists: true,
      etag: out.ETag?.replace(/"/g, ""),
      contentLength: out.ContentLength,
    };
  } catch {
    return { exists: false };
  }
};
