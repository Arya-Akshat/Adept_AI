import mongoose, { Schema, Document } from "mongoose";

export interface ISavedAnswer extends Document {
  userId: mongoose.Types.ObjectId;
  pdfId: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  savedAt: Date;
}

const SavedAnswerSchema = new Schema<ISavedAnswer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pdfId: {
      type: Schema.Types.ObjectId,
      ref: "LibraryFile",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness for saving a specific answer to a question for a user/pdf
SavedAnswerSchema.index({ userId: 1, pdfId: 1, question: 1 }, { unique: true });

const SavedAnswer = mongoose.model<ISavedAnswer>("SavedAnswer", SavedAnswerSchema);
export default SavedAnswer;
