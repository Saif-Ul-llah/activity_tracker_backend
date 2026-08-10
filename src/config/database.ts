import mongoose from "mongoose";
import { appConfig } from "./app_config";

// Serverless-safe connection.
//
// On Vercel each function invocation may reuse a warm container, but module-level
// state is NOT guaranteed to persist. Opening a new connection per invocation
// exhausts the Atlas connection pool. We cache the connection promise on the Node
// global so that concurrent/warm invocations share a single pending or established
// connection instead of each dialing MongoDB.

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache =
  global.__mongooseCache || (global.__mongooseCache = { conn: null, promise: null });

/**
 * Returns a live mongoose connection, reusing a cached one when available.
 * Safe to call on every request in a serverless environment.
 */
const connectDatabase = async (): Promise<typeof mongoose> => {
  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }

  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose
      .connect(appConfig.dbUrl, {
        // Keep the serverless pool small; Atlas free/shared tiers cap connections.
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => {
        console.log("MongoDB connected");
        return m;
      })
      .catch((error) => {
        // Reset so the next invocation retries instead of caching a rejected promise.
        cache.promise = null;
        console.error("MongoDB connection failed:", error);
        throw error;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
};

export { connectDatabase };
