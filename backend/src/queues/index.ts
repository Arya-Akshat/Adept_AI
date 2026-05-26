import { Queue } from "bullmq";
import { getRedisClient } from "../config/redis";
import logger from "../utils/logger";

let assessmentQueue: Queue | null = null;

export const getAssessmentQueue = (): Queue => {
  if (!assessmentQueue) {
    const connection = getRedisClient();
    assessmentQueue = new Queue("assessment-generation", {
      connection,
      defaultJobOptions: {
        removeOnComplete: {
          age: 3600, // 1 hour
        },
        removeOnFail: {
          age: 86400, // 24 hours
        },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    logger.info("BullMQ: Assessment queue initialized");
  }

  return assessmentQueue;
};

export const closeQueues = async (): Promise<void> => {
  if (assessmentQueue) {
    await assessmentQueue.close();
    assessmentQueue = null;
    logger.info("BullMQ: Assessment queue closed");
  }
};
