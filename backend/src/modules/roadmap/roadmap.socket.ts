import { getIO } from "../../config/socket";
import logger from "../../utils/logger";

export interface RoadmapSocketPayload {
  pdfId: string;
  status: "queued" | "processing" | "ready" | "failed";
  roadmap?: any;
  error?: string;
}

export interface VectorSocketPayload {
  pdfId: string;
  status: "queued" | "processing" | "ready" | "failed";
  error?: string;
}

export const emitRoadmapEvent = (
  eventName: string,
  payload: RoadmapSocketPayload | VectorSocketPayload
): void => {
  try {
    const io = getIO();
    io.to(payload.pdfId).emit(eventName, payload);
    logger.debug(
      { event: eventName, pdfId: payload.pdfId, status: payload.status },
      "Socket: Emitted roadmap/vector event"
    );
  } catch (err: any) {
    logger.error({ err: err.message, eventName }, "Socket: Failed to emit roadmap/vector event");
  }
};

export const emitRoadmapQueued = (pdfId: string): void => {
  emitRoadmapEvent("pdf:roadmap:processing", {
    pdfId,
    status: "queued",
  });
};

export const emitVectorQueued = (pdfId: string): void => {
  emitRoadmapEvent("pdf:vector:processing", {
    pdfId,
    status: "queued",
  });
};

export const emitRoadmapProcessing = (pdfId: string): void => {
  emitRoadmapEvent("pdf:roadmap:processing", {
    pdfId,
    status: "processing",
  });
};

export const emitRoadmapReady = (pdfId: string, roadmap: any): void => {
  emitRoadmapEvent("pdf:roadmap:ready", {
    pdfId,
    status: "ready",
    roadmap,
  });
};

export const emitRoadmapFailed = (pdfId: string, error: string): void => {
  emitRoadmapEvent("pdf:roadmap:failed", {
    pdfId,
    status: "failed",
    error,
  });
};

export const emitVectorProcessing = (pdfId: string): void => {
  emitRoadmapEvent("pdf:vector:processing", {
    pdfId,
    status: "processing",
  });
};

export const emitVectorReady = (pdfId: string): void => {
  emitRoadmapEvent("pdf:vector:ready", {
    pdfId,
    status: "ready",
  });
};

export const emitVectorFailed = (pdfId: string, error: string): void => {
  emitRoadmapEvent("pdf:vector:failed", {
    pdfId,
    status: "failed",
    error,
  });
};
