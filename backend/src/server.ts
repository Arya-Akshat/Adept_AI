import "dotenv/config";
import http from "http";
import app from "./app";
import { PORT, NODE_ENV } from "./config/env";
import connectToDatabase from "./config/db";
import { connectRedis, disconnectRedis } from "./config/redis";
import { initializeSocket } from "./config/socket";
import logger from "./utils/logger";

const startServer = async () => {
  // Create HTTP server (needed for Socket.io)
  const httpServer = http.createServer(app);

  // Connect to MongoDB
  await connectToDatabase();

  // Connect to Redis
  try {
    await connectRedis();
  } catch (err) {
    logger.error({ err }, "Failed to connect to Redis on startup");
    process.exit(1);
  }

  // Start BullMQ worker
  try {
    const { startAssessmentWorker } = await import("./modules/assessment/assessment.worker");
    startAssessmentWorker();
    logger.info("BullMQ: Assessment worker started");
  } catch (err) {
    logger.error({ err }, "Failed to start assessment worker");
    process.exit(1);
  }

  // Initialize Socket.io on the same HTTP server before listening
  initializeSocket(httpServer);

  // Start HTTP server
  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${NODE_ENV} environment`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    httpServer.close(async () => {
      logger.info("HTTP server closed");

      try {
        const { stopAssessmentWorker } = await import("./modules/assessment/assessment.worker");
        await stopAssessmentWorker();
      } catch (err) {
        logger.error({ err }, "Error stopping worker");
      }

      try {
        const { closeQueues } = await import("./queues");
        await closeQueues();
      } catch (err) {
        logger.error({ err }, "Error closing queues");
      }

      try {
        await disconnectRedis();
      } catch (err) {
        logger.error({ err }, "Error disconnecting Redis");
      }

      try {
        const mongoose = await import("mongoose");
        await mongoose.default.disconnect();
        logger.info("MongoDB disconnected");
      } catch (err) {
        logger.error({ err }, "Error disconnecting MongoDB");
      }

      logger.info("Graceful shutdown complete");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Unhandled rejection / uncaught exception
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    logger.error({ error }, "Uncaught exception");
    process.exit(1);
  });
};

startServer();
