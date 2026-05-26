import { Worker, Job } from "bullmq";
import { getRedisClient } from "../../config/redis";
import logger from "../../utils/logger";
import { WORKER_CONCURRENCY } from "../../config/env";
import type { AssessmentJobData } from "./assessment.types";
import {
  emitProcessing,
  emitProgress,
  emitCompleted,
  emitFailed,
} from "./assessment.socket";
import AssessmentModel from "../../models/Assessment";
import AssessmentJobModel from "../../models/AssessmentJob";
import { buildAssessmentPrompt } from "./assessment.prompts";
import { generateAssessment } from "../../services/groq.service";
import { parseAssessmentResponse } from "./assessment.parser";

let worker: Worker | null = null;

const processAssessmentJob = async (
  job: Job<AssessmentJobData>
): Promise<void> => {
  const { assessmentId } = job.data;
  const jobId = job.id ?? "unknown";

  logger.info({ jobId, assessmentId }, "Worker: Processing assessment job");

  try {
    await job.updateProgress(0);

    // Idempotency: check if the job has already completed
    const existingJob = await AssessmentJobModel.findOne({ jobId });
    if (existingJob && existingJob.status === "completed") {
      logger.info(
        { jobId, assessmentId },
        "Worker: Job already completed, skipping processing."
      );
      return;
    }

    // 1. Emit and update processing status
    emitProcessing(jobId, assessmentId);
    await job.updateProgress(10);

    await AssessmentModel.findByIdAndUpdate(assessmentId, {
      status: "processing",
    });

    await AssessmentJobModel.findOneAndUpdate(
      { jobId },
      {
        status: "processing",
        progress: 10,
        startedAt: new Date(),
        retryCount: job.attemptsMade - 1,
      },
      { upsert: true }
    );

    // 2. Emit and update generating sections status
    emitProgress(
      jobId,
      assessmentId,
      "generating_sections",
      40,
      "Generating assessment questions using AI..."
    );
    await job.updateProgress(40);

    await AssessmentJobModel.findOneAndUpdate(
      { jobId },
      {
        status: "generating_sections",
        progress: 40,
      }
    );

    // Generate paper content via Groq
    const prompt = buildAssessmentPrompt(job.data);
    const rawResponse = await generateAssessment(prompt);

    // 3. Emit and update formatting status
    emitProgress(
      jobId,
      assessmentId,
      "formatting",
      75,
      "Validating and formatting generated paper..."
    );
    await job.updateProgress(75);

    await AssessmentJobModel.findOneAndUpdate(
      { jobId },
      {
        status: "formatting",
        progress: 75,
      }
    );

    // Parse response and validate layout schema
    const parsedPaper = parseAssessmentResponse(rawResponse);

    // 4. Update DB and emit completed status
    await AssessmentModel.findByIdAndUpdate(assessmentId, {
      status: "completed",
      generatedPaper: parsedPaper,
    });

    await AssessmentJobModel.findOneAndUpdate(
      { jobId },
      {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
      }
    );

    emitCompleted(jobId, assessmentId, parsedPaper);
    await job.updateProgress(100);

    logger.info({ jobId, assessmentId }, "Worker: Job completed successfully");
  } catch (error: any) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { jobId, assessmentId, error: errorMessage },
      "Worker: Job processing failed"
    );

    // Update DB with failure details
    await AssessmentModel.findByIdAndUpdate(assessmentId, {
      status: "failed",
    });

    await AssessmentJobModel.findOneAndUpdate(
      { jobId },
      {
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      },
      { upsert: true }
    );

    emitFailed(jobId, assessmentId, errorMessage);

    // Re-throw so BullMQ can schedule retries according to configurations
    throw error;
  }
};

export const startAssessmentWorker = (): void => {
  const connection = getRedisClient();

  worker = new Worker<AssessmentJobData>(
    "assessment-generation",
    processAssessmentJob,
    {
      connection,
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Worker: Job completed successfully event");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message, attemptsMade: job?.attemptsMade },
      "Worker: Job failed event"
    );
  });

  worker.on("error", (err) => {
    logger.error({ error: err.message }, "Worker: Error event");
  });

  logger.info(
    { concurrency: WORKER_CONCURRENCY },
    "BullMQ: Assessment worker started"
  );
};

export const stopAssessmentWorker = async (): Promise<void> => {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info("BullMQ: Assessment worker stopped");
  }
};
