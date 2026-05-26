import { ErrorRequestHandler } from "express";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../constants/http";
import { z } from "zod";
import mongoose from "mongoose";
import logger from "../utils/logger";
import { AppError } from "../utils/errors";
import { clearAuthCookies, REFRESH_PATH } from "../utils/cookies";

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Log the error using Pino
  logger.error(
    { path: req.path, error: error.message || error, stack: error.stack },
    "Request Error"
  );

  if (req.path === REFRESH_PATH) {
    clearAuthCookies(res);
  }

  // 1. Zod Validation Error
  if (error instanceof z.ZodError) {
    const details = error.issues.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));
    res.status(BAD_REQUEST).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details,
      },
    });
    return;
  }

  // 2. Custom AppError (from errors.ts)
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.errorCode || error.code || "INTERNAL_ERROR",
        message: error.message,
      },
      // Backward compatibility fields for legacy ADEPT error mappings
      errorCode: error.errorCode,
      message: error.message,
    });
    return;
  }

  // 3. Mongoose Cast Error (Invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    res.status(BAD_REQUEST).json({
      success: false,
      error: {
        code: "INVALID_ID",
        message: `Invalid resource ID format: ${error.value}`,
      },
    });
    return;
  }

  // 4. Mongoose Validation Error
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((err) => ({
      path: err.path,
      message: err.message,
    }));
    res.status(BAD_REQUEST).json({
      success: false,
      error: {
        code: "DATABASE_VALIDATION_ERROR",
        message: "Database validation failed",
        details,
      },
    });
    return;
  }

  // 5. JWT Errors
  if (error.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid authorization token",
      },
    });
    return;
  }
  if (error.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Authorization token expired",
      },
    });
    return;
  }

  // 6. General internal errors
  res.status(INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};

export default errorHandler;
