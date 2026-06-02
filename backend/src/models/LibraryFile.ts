import mongoose, { Schema, Document } from "mongoose";

export interface ILibraryFile extends Document {
  userId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  supabaseUrl: string;
  uploadDate: Date;
  fileSize: number;
  hasRoadmap: boolean;
  isSyllabus: boolean;
  roadmapData?: any; // To store the generated JSON directly
  roadmapStatus: "not_started" | "queued" | "processing" | "ready" | "failed";
  vectorStatus: "not_started" | "queued" | "processing" | "ready" | "failed" | "na";
  roadmapError?: string;
  vectorError?: string;
  faqs?: string[];
}

const LibraryFileSchema = new Schema<ILibraryFile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    supabaseUrl: {
      type: String,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    hasRoadmap: {
      type: Boolean,
      default: false,
    },
    isSyllabus: {
      type: Boolean,
      default: false,
    },
    roadmapData: {
      type: Schema.Types.Mixed, // Allows flexible JSON structures
    },
    roadmapStatus: {
      type: String,
      enum: ["not_started", "queued", "processing", "ready", "failed"],
      default: "not_started",
      index: true,
    },
    vectorStatus: {
      type: String,
      enum: ["not_started", "queued", "processing", "ready", "failed", "na"],
      default: "not_started",
      index: true,
    },
    roadmapError: {
      type: String,
    },
    vectorError: {
      type: String,
    },
    faqs: [{ type: String }],
  },
  { timestamps: true }
);

const LibraryFile = mongoose.model<ILibraryFile>("LibraryFile", LibraryFileSchema);
export default LibraryFile;
