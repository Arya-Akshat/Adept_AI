import { Queue } from "bullmq";
import { getRedisClient } from "../config/redis";
import logger from "../utils/logger";

let assessmentQueue: Queue | null = null;
let roadmapQueue: Queue | null = null;
let vectorQueue: Queue | null = null;

const QUEUE_DEFAULT_OPTIONS = {
  removeOnComplete: {
    age: 3600, // 1 hour
  },
  removeOnFail: {
    age: 86400, // 24 hours
  },
  attempts: 2,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
};

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

export const getRoadmapQueue = (): Queue => {
  if (!roadmapQueue) {
    const connection = getRedisClient();
    roadmapQueue = new Queue("roadmap-generation", {
      connection,
      defaultJobOptions: QUEUE_DEFAULT_OPTIONS,
    });
    logger.info("BullMQ: Roadmap queue initialized");
  }
  return roadmapQueue;
};

export const getVectorQueue = (): Queue => {
  if (!vectorQueue) {
    const connection = getRedisClient();
    vectorQueue = new Queue("vector-ingestion", {
      connection,
      defaultJobOptions: QUEUE_DEFAULT_OPTIONS,
    });
    logger.info("BullMQ: Vector queue initialized");
  }
  return vectorQueue;
};

export const closeQueues = async (): Promise<void> => {
  if (assessmentQueue) {
    await assessmentQueue.close();
    assessmentQueue = null;
    logger.info("BullMQ: Assessment queue closed");
  }
  if (roadmapQueue) {
    await roadmapQueue.close();
    roadmapQueue = null;
    logger.info("BullMQ: Roadmap queue closed");
  }
  if (vectorQueue) {
    await vectorQueue.close();
    vectorQueue = null;
    logger.info("BullMQ: Vector queue closed");
  }
};
