import mongoose, { Schema, Document } from "mongoose";

export interface IGroup extends Document {
  teacherId: mongoose.Types.ObjectId;
  name: string;
  subject: string;
  grade: string;
  academicYear: string;
  subjectColumns: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    subjectColumns: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
GroupSchema.index({ teacherId: 1 });
GroupSchema.index({ createdAt: -1 });

const Group = mongoose.model<IGroup>("Group", GroupSchema);
export default Group;
