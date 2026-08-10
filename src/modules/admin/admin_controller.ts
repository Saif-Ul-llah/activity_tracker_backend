import {
  asyncHandler,
  NextFunction,
  Request,
  Response,
  sendResponse,
  HttpError,
  adminCreateUserValidation,
  adminUpdateUserValidation,
} from "../../imports";
import AdminServices from "./admin_services";
import type { RangeFilter } from "./admin_repo";

const DAY_MS = 24 * 60 * 60 * 1000;

// Parse from/to (ISO or ms epoch) with a sensible default window (last 7 days),
// plus optional userId/deviceId scoping.
function parseFilter(req: Request): RangeFilter {
  const q = req.query;
  const now = Date.now();
  const to = q.to ? new Date(isNaN(+q.to!) ? String(q.to) : +q.to!) : new Date(now);
  const from = q.from
    ? new Date(isNaN(+q.from!) ? String(q.from) : +q.from!)
    : new Date(now - 7 * DAY_MS);
  return {
    from,
    to,
    userId: q.userId ? String(q.userId) : undefined,
    deviceId: q.deviceId ? String(q.deviceId) : undefined,
  };
}

function parsePage(req: Request): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(
    200,
    Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50)
  );
  return { page, limit };
}

class AdminController {
  static overview = asyncHandler(async (req: Request, res: Response) => {
    const data = await AdminServices.overview(parseFilter(req));
    return sendResponse(res, 200, "Overview", data, "success");
  });

  static users = asyncHandler(async (_req: Request, res: Response) => {
    const data = await AdminServices.users();
    return sendResponse(res, 200, "Users", data, "success");
  });

  static devices = asyncHandler(async (_req: Request, res: Response) => {
    const data = await AdminServices.devices();
    return sendResponse(res, 200, "Devices", data, "success");
  });

  static activity = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePage(req);
    const data = await AdminServices.activity(parseFilter(req), page, limit);
    return sendResponse(res, 200, "Activity", data, "success");
  });

  static screenshots = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePage(req);
    const data = await AdminServices.screenshots(parseFilter(req), page, limit);
    return sendResponse(res, 200, "Screenshots", data, "success");
  });

  static events = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePage(req);
    const data = await AdminServices.events(parseFilter(req), page, limit);
    return sendResponse(res, 200, "Events", data, "success");
  });

  // ── User management ───────────────────────────────────────────────────────────
  static createUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = adminCreateUserValidation.validate({ ...req.body });
      if (error) return next(HttpError.validationError(error.details[0].message));
      const data = await AdminServices.createUser(value);
      return sendResponse(res, 201, "User created", data, "success");
    }
  );

  static updateUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = adminUpdateUserValidation.validate({ ...req.body });
      if (error) return next(HttpError.validationError(error.details[0].message));
      const data = await AdminServices.updateUser(req.params.id, value);
      return sendResponse(res, 200, "User updated", data, "success");
    }
  );

  static revokeDevice = asyncHandler(async (req: Request, res: Response) => {
    const revoked = req.body?.revoked !== false; // default true
    const data = await AdminServices.revokeDevice(req.params.id, revoked);
    return sendResponse(res, 200, "Device updated", data, "success");
  });

  // ── Storage / global settings ─────────────────────────────────────────────────
  static storage = asyncHandler(async (_req: Request, res: Response) => {
    const data = await AdminServices.storage();
    return sendResponse(res, 200, "Storage", data, "success");
  });

  static deleteScreenshots = asyncHandler(async (req: Request, res: Response) => {
    const b = req.body ?? {};
    const sel = {
      ids: Array.isArray(b.ids) ? b.ids.map(String) : undefined,
      deviceId: b.deviceId ? String(b.deviceId) : undefined,
      userId: b.userId ? String(b.userId) : undefined,
      before: typeof b.before === "number" ? b.before : undefined,
      all: b.all === true,
    };
    const data = await AdminServices.deleteScreenshots(sel);
    return sendResponse(res, 200, "Screenshots deleted", data, "success");
  });

  static updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const changes: {
      screenshotUploadEnabled?: boolean;
      r2LimitBytes?: number;
    } = {};
    if (typeof body.screenshotUploadEnabled === "boolean")
      changes.screenshotUploadEnabled = body.screenshotUploadEnabled;
    if (typeof body.r2LimitBytes === "number" && body.r2LimitBytes >= 0)
      changes.r2LimitBytes = body.r2LimitBytes;
    const data = await AdminServices.updateGlobalSettings(changes);
    return sendResponse(res, 200, "Settings updated", data, "success");
  });
}

export default AdminController;
