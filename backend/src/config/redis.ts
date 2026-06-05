import Redis from "ioredis";
import logger from "../utils/logger";
import { REDIS_URL } from "./env";

export let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<Redis> => {
  if (redisClient) return redisClient;

  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy: (times: number) => {
      const isProd = process.env.NODE_ENV === "production";
      if (!isProd && times > 10) {
        logger.error("Redis: Max retry attempts reached");
        return null;
      }
      const delay = Math.min(times * 500, 5000);
      logger.warn(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  redisClient.on("connect", () => {
    logger.info("Redis: Connected successfully");
  });

  redisClient.on("error", (err) => {
    logger.error({ err: err.message }, "Redis: Connection error");
  });

  redisClient.on("close", () => {
    logger.warn("Redis: Connection closed");
  });

  // In production, do not block server startup or fail permanently if Redis is sleeping/slow.
  // Let ioredis handle the connection in the background.
  if (process.env.NODE_ENV === "production") {
    return redisClient;
  }

  await new Promise<void>((resolve, reject) => {
    if (!redisClient) {
      reject(new Error("Redis client initialization failed"));
      return;
    }

    const handleReady = () => {
      redisClient?.off("error", handleError);
      resolve();
    };

    const handleError = (err: Error) => {
      redisClient?.off("ready", handleReady);
      reject(err);
    };

    redisClient.once("ready", handleReady);
    redisClient.once("error", handleError);
  });

  return redisClient;
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis: Disconnected");
  }
};
