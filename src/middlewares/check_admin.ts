import { NextFunction, Request, Response } from "express";
import { HttpError } from "../imports";
import { Roles } from "../types/authTypes";

// Gate for /api/admin/* — must run AFTER checkToken (which populates req.user).
// Only ADMIN / SUB_ADMIN may read the monitoring + analytics data.
const checkAdmin = (req: Request, _res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== Roles.ADMIN && role !== Roles.SUB_ADMIN) {
    throw HttpError.unAuthorized();
  }
  next();
};

export { checkAdmin };
