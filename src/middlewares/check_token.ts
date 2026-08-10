import { NextFunction, Request, Response } from "express";
import { decryptToken, HttpError, UserModel } from "./../imports";
import { asyncHandler } from "./async";

const checkToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = decryptToken(token);
    if (!decoded) {
      return res.status(401).json({
        status: "failed",
        message: "Token is Expired or Invalid",
        data: null,
      });
    }
    const user = decoded as { [key: string]: any };

    const dbUser = await UserModel.findById(user.id);
    if (!dbUser) {
      throw HttpError.invalidTokens();
    } else if (user.isDisable) {
      throw HttpError.notFound("User not found");
    }
    req.user = dbUser;
    next();
  }
);

export { checkToken };
