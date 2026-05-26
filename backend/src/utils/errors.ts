import AppErrorCode from "../constants/appErrorCode";
import { HttpStatusCode } from "../constants/http";

export class AppError extends Error {
  constructor(
    public statusCode: HttpStatusCode,
    public message: string,
    public code: string = "INTERNAL_ERROR",
    public errorCode?: AppErrorCode
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ParseError extends AppError {
  constructor(message: string) {
    super(400, message, "AI_PARSE_FAILED");
    this.name = "ParseError";
  }
}

export class AIGenerationError extends AppError {
  constructor(message: string) {
    super(500, message, "AI_GENERATION_FAILED");
    this.name = "AIGenerationError";
  }
}
