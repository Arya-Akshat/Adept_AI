import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("4004"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  APP_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  RAW_DATA_PATH: z.string().min(1, "RAW_DATA_PATH is required"),
  PROCESSED_DATA_PATH: z.string().min(1, "PROCESSED_DATA_PATH is required"),
  FLASK_URL: z.string().default("http://localhost:5001"),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  WORKER_CONCURRENCY: z.string().default("3"),
  MAX_SOURCE_CONTENT_CHARS: z.string().default("3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write(
    `Invalid environment variables: ${JSON.stringify(
      parsed.error.flatten().fieldErrors
    )}\n`
  );
  process.exit(1);
}

export const env = parsed.data;

// Backward-compatible individual exports (used by existing code)
export const NODE_ENV = env.NODE_ENV;
export const PORT = env.PORT;
export const MONGO_URI = env.MONGO_URI;
export const JWT_SECRET = env.JWT_SECRET;
export const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
export const APP_ORIGIN = env.APP_ORIGIN;
export const FRONTEND_URL = env.FRONTEND_URL;
export const RAW_DATA_PATH = env.RAW_DATA_PATH;
export const PROCESSED_DATA_PATH = env.PROCESSED_DATA_PATH;
export const FLASK_URL = env.FLASK_URL;
export const GEMINI_API_KEY = env.GEMINI_API_KEY;
export const GROQ_API_KEY = env.GROQ_API_KEY;
export const REDIS_URL = env.REDIS_URL;
export const WORKER_CONCURRENCY = parseInt(env.WORKER_CONCURRENCY, 10);
export const MAX_SOURCE_CONTENT_CHARS = parseInt(env.MAX_SOURCE_CONTENT_CHARS, 10);
