import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion {
  questionNumber: number;
  questionText: string;
  type: "mcq" | "short" | "long";
  cognitiveLevel: "remembering" | "understanding" | "applying" | "analyzing" | "evaluating" | "creating";
  options?: string[]; // For MCQ questions
  correctAnswer: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface IQuestionBank extends Document {
  teacherId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  metadata: {
    title: string;
    subject: string;
    questionCount: number;
    generatedAt: Date;
  };
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionNumber: { type: Number, required: true },
  questionText: { type: String, required: true },
  type: { type: String, enum: ["mcq", "short", "long"], required: true },
  cognitiveLevel: {
    type: String,
    enum: ["remembering", "understanding", "applying", "analyzing", "evaluating", "creating"],
    required: true
  },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true },
  marks: { type: Number, required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
});

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    metadata: {
      title: { type: String, required: true },
      subject: { type: String, required: true },
      questionCount: { type: Number, required: true },
      generatedAt: { type: Date, default: Date.now },
    },
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

const QuestionBank = mongoose.model<IQuestionBank>("QuestionBank", QuestionBankSchema);
export default QuestionBank;
