/// <reference path="./types.d.ts" />
import "./polyfill";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { APP_ORIGIN, FASTAPI_URL, FRONTEND_URL } from "./config/env";
import { apiLimiter } from "./middleware/rateLimiter.middleware";
import logger from "./utils/logger";

// Import existing routes
import apiRoutes from "./modules/upload/upload.routes";
import authRoutes from "./modules/auth/auth.routes";
import pdfRoutes from "./modules/roadmap/roadmap.routes";
import userRoutes from "./routes/user.route";
import assessmentRoutes from "./modules/assessment/assessment.routes";
import toolkitRoutes from "./modules/toolkit/toolkit.routes";
import courseRoutes from "./modules/course/course.routes";
import groupsRoutes from "./modules/groups/groups.routes";

// Import existing middleware
import authenticate from "./middleware/auth.middleware";
import errorHandler from "./middleware/error.middleware";

import { OK } from "./constants/http";

const app = express();

// Trust proxy (required for rate limiting behind Render's load balancer)
app.set("trust proxy", 1);

// CORS MUST be before rate limiters and body parsers so OPTIONS requests aren't blocked
app.use(
  cors({
    origin: (origin, callback) => callback(null, origin || true),
    credentials: true,
  })
);

// Security middleware
app.use(helmet());
app.use(apiLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Cookies
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
      },
      "HTTP Request completed"
    );
  });
  next();
});

// Health check
app.get("/", (_req, res) => {
  res.status(OK).json({ status: "healthy" });
});
app.get("/health", (_req, res) => {
  res.status(OK).json({ status: "healthy" });
});

app.get("/health-check", async (_req, res) => {
  const { redisClient } = await import("./config/redis");
  const LibraryFile = (await import("./models/LibraryFile")).default;

  let redisStatus = "not initialized";
  let redisPing = "failed";
  if (redisClient) {
    redisStatus = redisClient.status;
    try {
      redisPing = await redisClient.ping();
    } catch (err: any) {
      redisPing = `error: ${err.message}`;
    }
  }

  let libraryFiles: any[] = [];
  try {
    const files = await LibraryFile.find().sort({ uploadDate: -1 }).limit(10);
    libraryFiles = files.map(f => ({
      filename: f.filename,
      originalName: f.originalName,
      roadmapStatus: f.roadmapStatus,
      roadmapError: f.roadmapError,
      vectorStatus: f.vectorStatus,
      vectorError: f.vectorError,
      uploadDate: f.uploadDate
    }));
  } catch (err: any) {
    libraryFiles = [{ error: err.message }];
  }

  res.status(OK).json({
    status: "healthy",
    redis: {
      status: redisStatus,
      ping: redisPing
    },
    libraryFiles
  });
});

// Existing routes (preserved at original paths)
app.use("/auth", authRoutes);
app.use("/api", authenticate, apiRoutes);
app.use("/api/pdfs", authenticate, pdfRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/toolkit", toolkitRoutes);
app.use("/api/courses", authenticate, courseRoutes);
app.use("/api/groups", groupsRoutes);

// Protected routes
app.use("/user", authenticate, userRoutes);
app.use("/api/user", authenticate, userRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
