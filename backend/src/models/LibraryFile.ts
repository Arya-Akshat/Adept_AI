import mongoose, { Schema, Document } from "mongoose";

export interface ILibraryFile extends Document {
  userId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  supabaseUrl: string;
  uploadDate: Date;
  fileSize: number;
  hasRoadmap: boolean;
  isSyllabus: boolean;
  roadmapData?: any; // To store the generated JSON directly
}

const LibraryFileSchema = new Schema<ILibraryFile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  },
  { timestamps: true }
);

const LibraryFile = mongoose.model<ILibraryFile>("LibraryFile", LibraryFileSchema);
export default LibraryFile;
