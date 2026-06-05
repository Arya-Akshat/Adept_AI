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

  // Connect to Redis (Optional for Render deployments without Redis)
  let redisConnected = false;
  try {
    await connectRedis();
    redisConnected = true;
  } catch (err) {
    logger.warn({ err }, "Failed to connect to Redis. Assessment generation will be disabled.");
  }

  // Start BullMQ worker (Only if Redis is connected)
  if (redisConnected) {
    try {
      const { startAssessmentWorker } = await import("./modules/assessment/assessment.worker");
      startAssessmentWorker();
      logger.info("BullMQ: Assessment worker started");
    } catch (err) {
      logger.error({ err }, "Failed to start assessment worker");
    }

    try {
      const { startRoadmapWorker } = await import("./modules/roadmap/roadmap.worker");
      startRoadmapWorker();
      logger.info("BullMQ: Roadmap worker started");
    } catch (err) {
      logger.error({ err }, "Failed to start roadmap worker");
    }

    try {
      const { startVectorWorker } = await import("./modules/roadmap/vector.worker");
      startVectorWorker();
      logger.info("BullMQ: Vector worker started");
    } catch (err) {
      logger.error({ err }, "Failed to start vector worker");
    }
  }

  // Initialize Socket.io on the same HTTP server before listening
  initializeSocket(httpServer);

  // Start HTTP server
  httpServer.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT} in ${NODE_ENV} environment`);
    
    // Wake up self and Python service to keep them awake (Render/similar cold starts)
    try {
      import("axios").then((axios) => {
        // 1. Self-ping Node backend
        const pingSelf = () => {
          const url = `http://localhost:${PORT}/health`;
          logger.info(`Pinging Node backend self-health at ${url}...`);
          axios.default.get(url, { timeout: 10000 })
            .then((res) => {
              logger.info(`Self-ping Node backend status: ${res.status}`);
            })
            .catch((err) => {
              logger.warn(`Self-ping Node backend failed: ${err.message}`);
            });
        };
        pingSelf(); // Initial self ping
        setInterval(pingSelf, 5 * 60 * 1000); // Node self ping every 5 minutes

        // 2. Ping Python service
        import("./config/env").then(({ FASTAPI_URL }) => {
          if (FASTAPI_URL) {
            const pingPython = () => {
              logger.info(`Pinging Python service at ${FASTAPI_URL} to keep it awake...`);
              axios.default.get(FASTAPI_URL, { timeout: 10000 }).catch(() => {});
            };
            pingPython(); // Initial python ping
            setInterval(pingPython, 5 * 60 * 1000); // Python ping every 5 minutes
          }
        });
      });
    } catch (err) {
      logger.warn("Failed to setup service wake-up polling");
    }

    // 3. Redis keep-alive ping (prevents Render free-tier Redis from sleeping)
    if (redisConnected) {
      const { redisClient } = await import("./config/redis");
      if (redisClient) {
        const pingRedis = () => {
          redisClient.ping()
            .then((res) => {
              logger.info(`Redis keep-alive ping: ${res}`);
            })
            .catch((err) => {
              logger.warn(`Redis keep-alive ping failed: ${err.message}`);
            });
        };
        pingRedis(); // Initial ping
        setInterval(pingRedis, 5 * 60 * 1000); // Every 5 minutes
      }
    }
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
        logger.error({ err }, "Error stopping assessment worker");
      }

      try {
        const { stopRoadmapWorker } = await import("./modules/roadmap/roadmap.worker");
        await stopRoadmapWorker();
      } catch (err) {
        logger.error({ err }, "Error stopping roadmap worker");
      }

      try {
        const { stopVectorWorker } = await import("./modules/roadmap/vector.worker");
        await stopVectorWorker();
      } catch (err) {
        logger.error({ err }, "Error stopping vector worker");
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
