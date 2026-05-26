import { getIO } from "../../config/socket";
import logger from "../../utils/logger";
import type { AssessmentSocketPayload, JobStatus } from "./assessment.types";

export const emitAssessmentEvent = (
  eventName: string,
  payload: AssessmentSocketPayload
): void => {
  try {
    const io = getIO();
    io.to(payload.jobId).emit(eventName, payload);
    logger.debug(
      { event: eventName, jobId: payload.jobId, status: payload.status },
      "Socket: Emitted assessment event"
    );
  } catch (err) {
    logger.error({ err, eventName }, "Socket: Failed to emit event");
  }
};

export const emitQueued = (jobId: string, assessmentId: string): void => {
  emitAssessmentEvent("assessment:queued", {
    jobId,
    assessmentId,
    status: "queued",
    progress: 0,
  });
};

export const emitProcessing = (jobId: string, assessmentId: string): void => {
  emitAssessmentEvent("assessment:processing", {
    jobId,
    assessmentId,
    status: "processing",
    progress: 10,
  });
};

export const emitProgress = (
  jobId: string,
  assessmentId: string,
  status: JobStatus,
  progress: number,
  message?: string
): void => {
  emitAssessmentEvent("assessment:progress", {
    jobId,
    assessmentId,
    status,
    progress,
    message,
  });
};

export const emitCompleted = (
  jobId: string,
  assessmentId: string,
  result: AssessmentSocketPayload["result"]
): void => {
  emitAssessmentEvent("assessment:completed", {
    jobId,
    assessmentId,
    status: "completed",
    progress: 100,
    result,
  });
};

export const emitFailed = (
  jobId: string,
  assessmentId: string,
  error: string
): void => {
  emitAssessmentEvent("assessment:failed", {
    jobId,
    assessmentId,
    status: "failed",
    progress: 0,
    error,
  });
};
