import { Worker, Job } from "bullmq";
import { getRedisClient } from "../../config/redis";
import logger from "../../utils/logger";
import { VECTOR_WORKER_CONCURRENCY } from "../../config/env";
import LibraryFile from "../../models/LibraryFile";
import { API } from "../../services/gemini.service";
import {
  emitVectorProcessing,
  emitVectorReady,
  emitVectorFailed,
} from "./roadmap.socket";

export interface VectorJobData {
  pdfId: string;
  userId: string;
  extractedText: string;
  roadmapTopics: any[];
}

let worker: Worker | null = null;

const processVectorJob = async (job: Job<VectorJobData>): Promise<void> => {
  const { pdfId, extractedText, roadmapTopics } = job.data;
  const jobId = job.id ?? "unknown";

  logger.info({ jobId, pdfId }, "Worker: Processing vector ingestion job");

  try {
    // 1. Update status to processing in DB
    const pdf = await LibraryFile.findById(pdfId);
    if (!pdf) {
      throw new Error(`PDF not found: ${pdfId}`);
    }

    pdf.vectorStatus = "processing";
    await pdf.save();

    // 2. Emit socket event
    emitVectorProcessing(pdfId);
    await job.updateProgress(10);

    // 3. Call FastAPI POST /ingest-document
    const response = await API.post(`/ingest-document`, {
      pdfId,
      extractedText,
      roadmapTopics,
    });

    const responseData = response.data as any;
    if (!response || !responseData || responseData.success !== true) {
      throw new Error("FastAPI document ingestion failed or returned invalid response");
    }

    // 4. On success: Update DB
    pdf.vectorStatus = "ready";
    await pdf.save();

    // Emit socket ready
    emitVectorReady(pdfId);
    await job.updateProgress(100);

    logger.info({ jobId, pdfId }, "Worker: Vector ingestion job completed successfully");
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message;
    logger.error({ jobId, pdfId, error: errorMessage }, "Worker: Vector ingestion job failed");

    // Update status to failed
    await LibraryFile.findByIdAndUpdate(pdfId, {
      vectorStatus: "failed",
      vectorError: errorMessage,
    });

    // Emit socket failed
    emitVectorFailed(pdfId, errorMessage);
    throw error;
  }
};

export const startVectorWorker = (): void => {
  const connection = getRedisClient();

  worker = new Worker<VectorJobData>(
    "vector-ingestion",
    processVectorJob,
    {
      connection,
      concurrency: VECTOR_WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Worker: Vector job completed event");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message, attemptsMade: job?.attemptsMade },
      "Worker: Vector job failed event"
    );
  });

  worker.on("error", (err) => {
    logger.error({ error: err.message }, "Worker: Vector worker error event");
  });

  logger.info(
    { concurrency: VECTOR_WORKER_CONCURRENCY },
    "BullMQ: Vector worker started"
  );
};

export const stopVectorWorker = async (): Promise<void> => {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info("BullMQ: Vector worker stopped");
  }
};
