import mongoose, { Document, Schema } from "mongoose";

export interface QuestionDoc {
  questionNumber: number;
  text: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  bloomLevel: string;
  type: string;
  options?: string[];
  answer?: string;
}

export interface SectionDoc {
  title: string;
  instruction: string;
  questions: QuestionDoc[];
}

export interface PaperMetadataDoc {
  subject: string;
  totalMarks: number;
  duration: number;
  generatedAt: Date;
  instructions: string;
}

export interface GeneratedPaperDoc {
  metadata: PaperMetadataDoc;
  sections: SectionDoc[];
}

export interface DifficultyDistributionDoc {
  easy: number;
  medium: number;
  hard: number;
}

export interface AssessmentDocument extends Document {
  title: string;
  teacherId: mongoose.Types.ObjectId;
  sourceType: "text" | "pdf" | "none";
  sourceContent?: string;
  dueDate?: Date;
  instructions?: string;
  subject: string;
  duration: number;
  questionTypes: string[];
  difficultyDistribution: DifficultyDistributionDoc;
  totalQuestions: number;
  totalMarks: number;
  status:
    | "draft"
    | "queued"
    | "processing"
    | "generating_sections"
    | "formatting"
    | "completed"
    | "failed";
  generatedPaper?: GeneratedPaperDoc;
  jobId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<QuestionDoc>(
  {
    questionNumber: { type: Number, required: true },
    text: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    marks: { type: Number, required: true },
    bloomLevel: { type: String, required: true },
    type: { type: String, required: true },
    options: { type: [String] },
    answer: { type: String },
  },
  { _id: false }
);

const SectionSchema = new Schema<SectionDoc>(
  {
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true },
  },
  { _id: false }
);

const PaperMetadataSchema = new Schema<PaperMetadataDoc>(
  {
    subject: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    duration: { type: Number, required: true },
    generatedAt: { type: Date, required: true },
    instructions: { type: String, default: "" },
  },
  { _id: false }
);

const GeneratedPaperSchema = new Schema<GeneratedPaperDoc>(
  {
    metadata: { type: PaperMetadataSchema, required: true },
    sections: { type: [SectionSchema], required: true },
  },
  { _id: false }
);

const DifficultyDistributionSchema = new Schema<DifficultyDistributionDoc>(
  {
    easy: { type: Number, required: true, min: 0 },
    medium: { type: Number, required: true, min: 0 },
    hard: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const AssessmentSchema = new Schema<AssessmentDocument>(
  {
    title: { type: String, required: true },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["text", "pdf", "none"],
      default: "none",
    },
    sourceContent: {
      type: String,
      maxlength: 50000,
    },
    dueDate: { type: Date },
    instructions: { type: String },
    subject: { type: String, required: true },
    duration: { type: Number, required: true },
    questionTypes: { type: [String], required: true },
    difficultyDistribution: {
      type: DifficultyDistributionSchema,
      required: true,
    },
    totalQuestions: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "draft",
        "queued",
        "processing",
        "generating_sections",
        "formatting",
        "completed",
        "failed",
      ],
      default: "draft",
      index: true,
    },
    generatedPaper: { type: GeneratedPaperSchema },
    jobId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound index for listing assessments by teacher
AssessmentSchema.index({ teacherId: 1, createdAt: -1 });
AssessmentSchema.index({ createdAt: -1 });

const AssessmentModel = mongoose.model<AssessmentDocument>(
  "Assessment",
  AssessmentSchema
);

export default AssessmentModel;
