import { appConfig, allRoutes, connectDatabase, errorHandler, Server } from "./imports";
import { createServer } from "http";
import type { Server as IOServer } from "socket.io";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import "dotenv/config";

export const app = express();

// Detect serverless (Vercel) — sockets and a long-lived listen() do not apply there.
const isServerless = Boolean(process.env.VERCEL);

// Socket.IO instance exists only in long-running mode; routes read it via req.io.
export let io: IOServer | undefined;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS: restrict to configured origins in production; allow all when none set (dev).
app.use(
  cors(
    appConfig.corsOrigins.length > 0
      ? {
          origin: appConfig.corsOrigins,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"],
          allowedHeaders: [
            "Content-Type",
            "Authorization",
            "Idempotency-Key",
            "If-None-Match",
          ],
        }
      : {}
  )
);

// In serverless, every invocation must ensure the (cached) DB connection is live
// before hitting a route. This middleware is a no-op cost once connected.
if (isServerless) {
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    // Keep the liveness probe DB-free so it stays a cheap, fast connectivity signal.
    if (req.path === "/api/agent/ping") return next();
    try {
      await connectDatabase();
      next();
    } catch (err) {
      next(err);
    }
  });
}

// Expose io to routes (undefined on serverless — routes must handle that).
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.io = io;
  next();
});

app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "success", message: "Server is running", data: null });
});

app.use("/api", allRoutes);

app.use(errorHandler);

// Long-running mode (local dev, Docker): attach Socket.IO and bind a port.
// Skipped entirely on Vercel, which imports `app` via the serverless handler.
if (!isServerless) {
  const httpServer = createServer(app);
  io = new Server(httpServer);

  connectDatabase().then(() => {
    httpServer.listen(appConfig.port, () => {
      console.log(
        `Server is running on: ${appConfig.appUrl || "http://localhost:5000"}`
      );
    });
  });
}

export default app;
