import { Response } from "express";

interface SuccessResponse<T> {
  success: true;
  data: T;
  warning?: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  warning?: string
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(warning ? { warning } : {}),
  } as SuccessResponse<T>);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode = 500
): void => {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  } as ErrorResponse);
};
