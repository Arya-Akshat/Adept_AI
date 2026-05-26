process.env.MONGO_URI = "mongodb://localhost:27017/adept";
import http from "http";
import app from "./app";
import { initializeSocket } from "./config/socket";
import { connectRedis, disconnectRedis } from "./config/redis";
import connectToDatabase from "./config/db";
import {
  startAssessmentWorker,
  stopAssessmentWorker,
} from "./modules/assessment/assessment.worker";
import UserModel from "./models/user.model";
import SessionModel from "./models/session.model";
import AssessmentModel from "./models/Assessment";
import AssessmentJobModel from "./models/AssessmentJob";
import { signToken } from "./utils/jwt";
import axios from "axios";
import { io as ClientIO } from "socket.io-client";
import logger from "./utils/logger";
import mongoose from "mongoose";

const PORT = 5009;
const BASE_URL = `http://localhost:${PORT}`;

async function runE2ETests() {
  logger.info("Starting End-to-End Release Audit and Verification...");

  // 1. Initialize Server & Services
  const httpServer = http.createServer(app);
  initializeSocket(httpServer);

  await connectToDatabase();
  await connectRedis();
  startAssessmentWorker();

  // Start listening on test port
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, () => {
      logger.info(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  let testUserId: string | null = null;
  let testSessionId: string | null = null;
  let testAssessmentId: string | null = null;
  let testJobId: string | null = null;

  try {
    // 2. Setup Mock Auth User & Session
    logger.info("Creating mock user and session...");
    let user = await UserModel.findOne({ email: "audit-test@vedaai.com" });
    if (!user) {
      user = new UserModel({
        email: "audit-test@vedaai.com",
        password: "password123",
        verified: true,
      });
      await user.save();
    }
    testUserId = user.id;

    let session = await SessionModel.findOne({ userId: user.id });
    if (!session) {
      session = new SessionModel({
        userId: user.id as any,
        userAgent: "Release Audit Test Harness",
      });
      await session.save();
    }
    testSessionId = session.id;

    const accessToken = signToken({
      userId: user.id as any,
      sessionId: session.id as any,
    });
    const authHeaders = {
      Cookie: `accessToken=${accessToken}`,
    };

    // 3. Setup WebSocket Client
    logger.info("Connecting Socket.io client...");
    const clientSocket = ClientIO(BASE_URL, {
      withCredentials: true,
    });

    const receivedEvents: Array<{ event: string; payload: any }> = [];

    await new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", () => {
        logger.info("Socket client connected successfully");
        resolve();
      });
      clientSocket.on("connect_error", (err) => {
        reject(new Error(`Socket connection failed: ${err.message}`));
      });
    });

    // 4. Execute POST /api/assessments/create
    logger.info("Sending create assessment request...");
    const createRes = await axios.post(
      `${BASE_URL}/api/assessments/create`,
      {
        title: "Release Audit Algebra Quiz",
        subject: "Mathematics",
        duration: 30,
        totalQuestions: 2,
        totalMarks: 10,
        questionTypes: ["MCQ"],
        difficultyDistribution: {
          easy: 1,
          medium: 1,
          hard: 0,
        },
        instructions: "Solve carefully. Non-programmable calculators allowed.",
        sourceType: "none",
        sourceContent: "",
      },
      { headers: authHeaders }
    );

    const { jobId, assessmentId } = (createRes.data as any).data;
    testAssessmentId = assessmentId;
    testJobId = jobId;
    logger.info(
      { jobId, assessmentId },
      "Create assessment request succeeded"
    );

    // 5. Join Room & Listen for WebSockets
    logger.info(`Joining socket room for job ${jobId}...`);
    clientSocket.emit("join", jobId);

    clientSocket.on("assessment:queued", (payload) => {
      logger.info({ payload }, "Socket: Queued Event");
      receivedEvents.push({ event: "assessment:queued", payload });
    });
    clientSocket.on("assessment:processing", (payload) => {
      logger.info({ payload }, "Socket: Processing Event");
      receivedEvents.push({ event: "assessment:processing", payload });
    });
    clientSocket.on("assessment:progress", (payload) => {
      logger.info({ payload }, "Socket: Progress Event");
      receivedEvents.push({ event: "assessment:progress", payload });
    });
    clientSocket.on("assessment:completed", (payload) => {
      logger.info({ payload }, "Socket: Completed Event");
      receivedEvents.push({ event: "assessment:completed", payload });
    });
    clientSocket.on("assessment:failed", (payload) => {
      logger.error({ payload }, "Socket: Failed Event");
      receivedEvents.push({ event: "assessment:failed", payload });
    });

    // 6. Wait for job completion in queue
    logger.info("Waiting for BullMQ worker to process assessment job...");
    let isFinished = false;
    const startTime = Date.now();
    const timeoutMs = 90000; // 90 seconds max for AI generation

    while (!isFinished && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const statusRes = await axios.get(
        `${BASE_URL}/api/assessments/job/${jobId}/status`,
        { headers: authHeaders }
      );
      const { status, progress, errorMessage } = (statusRes.data as any).data;
      logger.info(
        { status, progress, errorMessage },
        "Checking job status from API"
      );

      if (status === "completed") {
        isFinished = true;
        logger.info("Job completed successfully!");
      } else if (status === "failed") {
        isFinished = true;
        throw new Error(`Job processing failed with: ${errorMessage}`);
      }
    }

    if (!isFinished) {
      throw new Error("Job processing timed out after 90 seconds");
    }

    // 7. Verify MongoDB Persistence
    logger.info("Verifying persistence in MongoDB...");
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment || assessment.status !== "completed") {
      throw new Error(
        `Assessment in DB has invalid status: ${assessment?.status}`
      );
    }
    if (
      !assessment.generatedPaper ||
      assessment.generatedPaper.sections.length === 0
    ) {
      throw new Error("No generated question paper found in MongoDB");
    }
    logger.info("MongoDB persistence verified successfully");

    // 8. Verify PDF Exporter
    logger.info("Verifying PDF generation and streaming...");
    const pdfRes = await axios.get(
      `${BASE_URL}/api/assessments/${assessmentId}/pdf`,
      {
        headers: authHeaders,
        responseType: "arraybuffer",
      }
    );
    if (pdfRes.status !== 200) {
      throw new Error(`PDF generation API failed with status ${pdfRes.status}`);
    }
    const pdfBuffer = Buffer.from(pdfRes.data as any);
    logger.info(
      { sizeBytes: pdfBuffer.length },
      "PDF downloaded successfully"
    );

    if (pdfBuffer.length < 500) {
      throw new Error("Generated PDF appears empty or too small");
    }

    // 9. Verify GET /api/assessments (listing + pagination)
    logger.info("Verifying assessment listing route...");
    const listRes = await axios.get(`${BASE_URL}/api/assessments?page=1&limit=5`, {
      headers: authHeaders,
    });
    if ((listRes.data as any).data.assessments.length === 0) {
      throw new Error("Listing route returned 0 assessments");
    }
    logger.info(
      { count: (listRes.data as any).data.assessments.length },
      "Listing route verified"
    );

    // 10. Verify DELETE /api/assessments/:id
    logger.info("Verifying deletion route...");
    const deleteRes = await axios.delete(
      `${BASE_URL}/api/assessments/${assessmentId}`,
      { headers: authHeaders }
    );
    if (deleteRes.status !== 200) {
      throw new Error(`Delete endpoint failed with status ${deleteRes.status}`);
    }

    const checkDeleted = await AssessmentModel.findById(assessmentId);
    if (checkDeleted) {
      throw new Error("Assessment was not removed from DB after delete call");
    }
    logger.info("Deletion route verified successfully");

    // Close socket
    clientSocket.disconnect();

    logger.info(
      "=== ALL RUNTIME END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY ==="
    );
  } catch (err: any) {
    logger.error(
      { error: err.message, stack: err.stack },
      "End-to-End runtime verification failed!"
    );
    process.exitCode = 1;
  } finally {
    // 11. Cleanup test documents from database
    logger.info("Cleaning up E2E mock documents...");
    try {
      if (testAssessmentId) {
        await AssessmentModel.deleteOne({ _id: testAssessmentId });
        await AssessmentJobModel.deleteMany({ assessmentId: testAssessmentId as any });
      }
      if (testUserId) {
        await UserModel.deleteOne({ _id: testUserId });
        await SessionModel.deleteMany({ userId: testUserId as any });
      }
    } catch (cleanErr: any) {
      logger.error({ error: cleanErr.message }, "Cleanup failed");
    }

    // 12. Graceful Shutdown Services
    logger.info("Stopping E2E test server and workers...");
    await stopAssessmentWorker();
    await disconnectRedis();
    await mongoose.disconnect();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    logger.info("Graceful shutdown complete.");
  }
}

runE2ETests();
