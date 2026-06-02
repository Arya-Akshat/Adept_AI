import mongoose, { Schema, Document } from "mongoose";

export interface ISlide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  teacherNotes?: string;
  suggestedImagePrompt: string;
}

export interface IPresentation extends Document {
  teacherId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  metadata: {
    title: string;
    subject: string;
    slideCount: number;
    generatedAt: Date;
  };
  slides: ISlide[];
  createdAt: Date;
  updatedAt: Date;
}

const SlideSchema = new Schema<ISlide>({
  slideNumber: { type: Number, required: true },
  title: { type: String, required: true },
  bulletPoints: [{ type: String, required: true }],
  teacherNotes: { type: String },
  suggestedImagePrompt: { type: String, required: true },
});

const PresentationSchema = new Schema<IPresentation>(
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
      slideCount: { type: Number, required: true },
      generatedAt: { type: Date, default: Date.now },
    },
    slides: [SlideSchema],
  },
  { timestamps: true }
);

const Presentation = mongoose.model<IPresentation>("Presentation", PresentationSchema);
export default Presentation;
