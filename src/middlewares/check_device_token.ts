import { NextFunction, Request, Response } from "express";
import { verifyDeviceToken, HttpError, DeviceModel } from "../imports";
import { asyncHandler } from "./async";

// Guards /api/agent/* routes. Verifies the long-lived device token, enforces the
// 'agent' scope, and checks revocation by matching the token's tokenId against the
// device document's current tokenId. Populates req.device for downstream handlers.
const checkDeviceToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw HttpError.invalidTokens();
    }

    const token = authorization.split(" ")[1];
    const payload = token ? verifyDeviceToken(token) : null;
    if (!payload) {
      throw HttpError.invalidTokens();
    }

    if (!payload.scope || !payload.scope.includes("agent")) {
      throw HttpError.unAuthorized();
    }

    const device = await DeviceModel.findById(payload.deviceId);
    if (
      !device ||
      device.revoked ||
      device.tokenId !== payload.tokenId ||
      String(device.userId) !== String(payload.userId)
    ) {
      // Wrong/rotated/revoked token, or device deleted.
      throw HttpError.invalidTokens();
    }

    req.device = device;
    next();
  }
);

export { checkDeviceToken };
