import mongoose, { Document, Schema } from "mongoose";

export interface RubricLevelDoc {
  label: string;
  score: number;
  descriptor: string;
}

export interface RubricCriteriaDoc {
  name: string;
  weight: number;
  marks: number;
  levels: RubricLevelDoc[];
}

export interface RubricMetadataDoc {
  assignmentTitle: string;
  assignmentType: string;
  gradeLevel: string;
  totalMarks: number;
  generatedAt: Date;
}

export interface RubricDocument extends Document {
  teacherId: mongoose.Types.ObjectId;
  metadata: RubricMetadataDoc;
  criteria: RubricCriteriaDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const RubricLevelSchema = new Schema<RubricLevelDoc>(
  {
    label: { type: String, required: true },
    score: { type: Number, required: true },
    descriptor: { type: String, required: true },
  },
  { _id: false }
);

const RubricCriteriaSchema = new Schema<RubricCriteriaDoc>(
  {
    name: { type: String, required: true },
    weight: { type: Number, required: true },
    marks: { type: Number, required: true },
    levels: { type: [RubricLevelSchema], required: true },
  },
  { _id: false }
);

const RubricMetadataSchema = new Schema<RubricMetadataDoc>(
  {
    assignmentTitle: { type: String, required: true },
    assignmentType: { type: String, required: true },
    gradeLevel: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    generatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const RubricSchema = new Schema<RubricDocument>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    metadata: { type: RubricMetadataSchema, required: true },
    criteria: { type: [RubricCriteriaSchema], required: true },
  },
  {
    timestamps: true,
  }
);

RubricSchema.index({ teacherId: 1, createdAt: -1 });

const RubricModel = mongoose.model<RubricDocument>("Rubric", RubricSchema);
export default RubricModel;
