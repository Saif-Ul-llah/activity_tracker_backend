import {
  asyncHandler,
  NextFunction,
  Request,
  Response,
  sendResponse,
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
}

export default AdminController;
