import {
  asyncHandler,
  NextFunction,
  Request,
  Response,
  sendResponse,
  HttpError,
  registerDeviceValidation,
  activityBatchValidation,
  presignValidation,
  confirmValidation,
  agentEventsValidation,
  browserTabsValidation,
} from "../../imports";
import AgentServices from "./agent_services";

class AgentController {
  // POST /api/agent/devices/register   (user JWT)
  public static registerDevice = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = registerDeviceValidation.validate({
        ...req.body,
      });
      if (error) {
        return next(HttpError.validationError(error.details[0].message));
      }
      const userId = String(req.user.id);
      const result = await AgentServices.registerDeviceService(userId, value);
      return sendResponse(res, 201, "Device registered", result, "success");
    }
  );

  // GET /api/agent/settings   (device token)
  public static getSettings = asyncHandler(
    async (req: Request, res: Response) => {
      const ifNoneMatch = req.headers["if-none-match"] as string | undefined;
      const result = await AgentServices.getSettingsService(
        req.device,
        ifNoneMatch
      );
      res.setHeader("ETag", result.etag);
      if (result.notModified) {
        return res.status(304).end();
      }
      return sendResponse(res, 200, "Settings", result.settings, "success");
    }
  );

  // HEAD/GET /api/agent/ping   (public, no DB) — authoritative connectivity probe.
  public static ping = (_req: Request, res: Response) => {
    res.status(200).end();
  };

  // POST /api/agent/activity/batch   (device token)
  public static activityBatch = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = activityBatchValidation.validate({
        ...req.body,
      });
      if (error) {
        return next(HttpError.validationError(error.details[0].message));
      }
      const result = await AgentServices.ingestActivityService(
        req.device,
        value
      );
      return sendResponse(res, 200, "Activity ingested", result, "success");
    }
  );

  // POST /api/agent/screenshots/presign   (device token)
  public static presign = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = presignValidation.validate({ ...req.body });
      if (error) {
        return next(HttpError.validationError(error.details[0].message));
      }
      const result = await AgentServices.presignScreenshotsService(
        req.device,
        value
      );
      return sendResponse(res, 200, "Presigned URLs", result, "success");
    }
  );

  // POST /api/agent/screenshots/confirm   (device token)
  public static confirm = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = confirmValidation.validate({ ...req.body });
      if (error) {
        return next(HttpError.validationError(error.details[0].message));
      }
      const result = await AgentServices.confirmScreenshotsService(
        req.device,
        value
      );
      return sendResponse(res, 200, "Screenshots confirmed", result, "success");
    }
  );

  // POST /api/agent/browser/tabs   (device token)
  public static browserTabs = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = browserTabsValidation.validate({ ...req.body });
      if (error) {
        return next(HttpError.validationError(error.details[0].message));
      }
      const result = await AgentServices.ingestBrowserTabsService(
        req.device,
        value
      );
      return sendResponse(res, 200, "Browser tabs ingested", result, "success");
    }
  );

  // POST /api/agent/events   (device token)
  public static events = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = agentEventsValidation.validate({ ...req.body });
      if (error) {
        return next(HttpError.validationError(error.details[0].message));
      }
      const result = await AgentServices.recordEventsService(req.device, value);
      return sendResponse(res, 200, "Events recorded", result, "success");
    }
  );
}

export default AgentController;
