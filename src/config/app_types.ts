import { Server } from "./../imports";
import type { IUser } from "../models";
import type { IDevice } from "../models/device_model";

declare global {
  namespace Express {
    interface Request {
      io?: Server;
      user: IUser;
      // Populated by checkDeviceToken on /api/agent/* routes.
      device: IDevice;
    }
  }
}

export {};
