import mongoose, { Schema, Document } from "mongoose";

export interface ICourse extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  color: string; // Theme color code for UI folder styles
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    userId: {
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
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: "#ea580c", // Brand orange default
    },
  },
  { timestamps: true }
);

const Course = mongoose.model<ICourse>("Course", CourseSchema);
export default Course;
