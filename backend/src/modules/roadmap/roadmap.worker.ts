import { Worker, Job } from "bullmq";
import { getRedisClient } from "../../config/redis";
import logger from "../../utils/logger";
import { ROADMAP_WORKER_CONCURRENCY } from "../../config/env";
import LibraryFile from "../../models/LibraryFile";
import { downloadFileFromSupabase } from "../../services/supabase.service";
import { API } from "../../services/gemini.service";
import FormData from "form-data";
import { getVectorQueue } from "../../queues";
import {
  emitRoadmapProcessing,
  emitRoadmapReady,
  emitRoadmapFailed,
} from "./roadmap.socket";

export interface RoadmapJobData {
  pdfId: string;
  userId: string;
  filePath: string;
  extractedText: string;
  fileType: "pdf" | "image";
}

let worker: Worker | null = null;

const processRoadmapJob = async (job: Job<RoadmapJobData>): Promise<void> => {
  const { pdfId, userId, fileType } = job.data;
  const jobId = job.id ?? "unknown";

  logger.info({ jobId, pdfId, userId }, "Worker: Processing roadmap generation job");

  try {
    // 1. Update status to processing in DB
    const pdf = await LibraryFile.findById(pdfId);
    if (!pdf) {
      throw new Error(`PDF not found: ${pdfId}`);
    }

    pdf.roadmapStatus = "processing";
    await pdf.save();

    // 2. Emit socket event
    emitRoadmapProcessing(pdfId);
    await job.updateProgress(10);

    // 3. Call FastAPI /getRoadmap
    const arrayBuffer = await downloadFileFromSupabase("adept-files", pdf.filename);

    const formData = new FormData();
    formData.append("userId", userId.toString());
    formData.append("pdf_file", Buffer.from(arrayBuffer), { filename: pdf.filename });

    const response = await API.post(`/getRoadmap`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    if (!response || !response.data) {
      throw new Error("FastAPI returned empty or invalid response");
    }

    const roadmapData = (response.data as any).body;

    // 4. Save to DB
    pdf.hasRoadmap = true;
    pdf.roadmapData = roadmapData;
    pdf.roadmapStatus = "ready";
    await pdf.save();

    // Emit socket ready
    emitRoadmapReady(pdfId, roadmapData);
    await job.updateProgress(100);

    // 5. Trigger vector ingestion job if vectorStatus is "queued"
    if (pdf.vectorStatus === "queued" && fileType === "pdf") {
      const roadmapTopics: any[] = [];
      if (roadmapData) {
        Object.entries(roadmapData).forEach(([unitIndexStr, unitObj]: [string, any]) => {
          const unitIndex = parseInt(unitIndexStr, 10);
          if (unitObj && typeof unitObj === "object") {
            Object.entries(unitObj).forEach(([topicIndexStr, topicObj]: [string, any]) => {
              const topicIndex = parseInt(topicIndexStr, 10);
              if (topicObj && typeof topicObj === "object") {
                roadmapTopics.push({
                  title: topicObj.title || "",
                  summary: topicObj.summary || "",
                  unitIndex,
                  topicIndex,
                });
              }
            });
          }
        });
      }

      if (roadmapTopics.length > 0) {
        logger.info({ pdfId, topicsCount: roadmapTopics.length }, "Worker: Enqueuing vector ingestion job");
        const vectorQueue = getVectorQueue();
        await vectorQueue.add(`vector-ingest-${pdfId}`, {
          pdfId,
          userId,
          extractedText: job.data.extractedText,
          roadmapTopics,
        });
      } else {
        logger.warn({ pdfId }, "Worker: Roadmap completed but no topics found to trigger vector ingestion");
      }
    }

    logger.info({ jobId, pdfId }, "Worker: Roadmap generation job completed successfully");
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message;
    logger.error({ jobId, pdfId, error: errorMessage }, "Worker: Roadmap generation job failed");

    // Update status to failed
    await LibraryFile.findByIdAndUpdate(pdfId, {
      roadmapStatus: "failed",
      roadmapError: errorMessage,
    });

    // Emit socket failed
    emitRoadmapFailed(pdfId, errorMessage);
    throw error;
  }
};

export const startRoadmapWorker = (): void => {
  const connection = getRedisClient();

  worker = new Worker<RoadmapJobData>(
    "roadmap-generation",
    processRoadmapJob,
    {
      connection,
      concurrency: ROADMAP_WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Worker: Roadmap job completed event");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message, attemptsMade: job?.attemptsMade },
      "Worker: Roadmap job failed event"
    );
  });

  worker.on("error", (err) => {
    logger.error({ error: err.message }, "Worker: Roadmap worker error event");
  });

  logger.info(
    { concurrency: ROADMAP_WORKER_CONCURRENCY },
    "BullMQ: Roadmap worker started"
  );
};

export const stopRoadmapWorker = async (): Promise<void> => {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info("BullMQ: Roadmap worker stopped");
  }
};
