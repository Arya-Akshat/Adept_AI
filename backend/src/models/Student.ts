import mongoose, { Schema, Document } from "mongoose";

export interface IAcademicEntry {
  columnName: string;
  marks: number;
  totalMarks: number;
  remarks?: string;
}

export interface IStudent extends Document {
  groupId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  name: string;
  rollNumber: string;
  email: string;
  phone: string;
  academicHistory: IAcademicEntry[];
  overallRemark: string;
  attendancePercent: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicEntrySchema = new Schema<IAcademicEntry>(
  {
    columnName: {
      type: String,
      required: true,
      trim: true,
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const StudentSchema = new Schema<IStudent>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
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
    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    academicHistory: {
      type: [AcademicEntrySchema],
      default: [],
    },
    overallRemark: {
      type: String,
      default: "",
    },
    attendancePercent: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StudentSchema.index({ groupId: 1 });
StudentSchema.index({ teacherId: 1 });
// Compound index for roll number uniqueness within a group
StudentSchema.index({ groupId: 1, rollNumber: 1 });

const Student = mongoose.model<IStudent>("Student", StudentSchema);
export default Student;
