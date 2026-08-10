import { NextFunction, Request, Response } from "express";
import { HttpError } from "./../imports";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("ERROR DETAILS:", err);

  let error: HttpError;

  if (err instanceof HttpError) {
    // Application-thrown errors already carry statusCode + code; pass through.
    error = err;
  } else if (err?.name === "CastError") {
    error = HttpError.invalidParameters(err.message);
  } else if (err?.code === 11000) {
    // Mongoose duplicate key
    const field = Object.keys(err.keyPattern || {}).join(", ") || "field";
    error = HttpError.alreadyExists(`Record with this ${field} already exists`);
  } else if (err?.name === "ValidationError") {
    // Mongoose schema validation
    const message = Object.values(err.errors || {})
      .map((val: any) => val.message)
      .join(", ");
    error = HttpError.validationError(message);
  } else {
    error = HttpError.databaseError(
      err?.message || "An unexpected error occurred"
    );
  }

  res.status(error.statusCode || 500).json({
    success: false,
    code: error.code || "server-error",
    message: error.message || "Server error occurred",
  });
};

export { errorHandler };
