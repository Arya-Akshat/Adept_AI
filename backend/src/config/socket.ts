import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import logger from "../utils/logger";
import { FRONTEND_URL, APP_ORIGIN } from "./env";

let io: SocketServer | null = null;

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket: Client connected");

    socket.on("join", (jobId: string) => {
      socket.join(jobId);
      logger.debug({ socketId: socket.id, jobId }, "Socket: Client joined room");
    });

    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, reason }, "Socket: Client disconnected");
    });
  });

  logger.info("Socket.io: Initialized");
  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initializeSocket() first.");
  }
  return io;
};
