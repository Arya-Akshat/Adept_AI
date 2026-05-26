import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { BAD_REQUEST } from "../constants/http";

export const validate = (schema: ZodSchema, target: "body" | "params" = "body") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      res.status(BAD_REQUEST).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: errors,
        },
      });
      return;
    }
    req[target] = result.data;
    next();
  };
};
