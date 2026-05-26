import mongoose, { Document, Schema } from "mongoose";

export interface AssessmentJobDocument extends Document {
  jobId: string;
  assessmentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  status:
    | "queued"
    | "processing"
    | "generating_sections"
    | "formatting"
    | "completed"
    | "failed";
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentJobSchema = new Schema<AssessmentJobDocument>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "queued",
        "processing",
        "generating_sections",
        "formatting",
        "completed",
        "failed",
      ],
      default: "queued",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    errorMessage: { type: String },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const AssessmentJobModel = mongoose.model<AssessmentJobDocument>(
  "AssessmentJob",
  AssessmentJobSchema
);

export default AssessmentJobModel;
