import mongoose from "mongoose";
import { z } from "zod";

export const createAssessmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  duration: z.number().int().positive("Duration must be positive"),
  totalQuestions: z.number().int().positive("Total questions must be positive"),
  totalMarks: z.number().int().positive("Total marks must be positive"),
  questionTypes: z
    .array(z.string())
    .min(1, "At least one question type is required"),
  difficultyDistribution: z.object({
    easy: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    hard: z.number().int().nonnegative(),
  }),
  dueDate: z
    .string()
    .datetime()
    .optional()
    .or(z.preprocess((val) => (val ? new Date(val as string) : val), z.date()))
    .optional(),
  instructions: z.string().optional().default(""),
  sourceType: z.enum(["text", "pdf", "none"]).optional().default("none"),
  sourceContent: z.string().optional().default(""),
});

export const assessmentIdParamsSchema = z.object({
  id: z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
    message: "Invalid assessment id",
  }),
});

export const regenerateAssessmentParamsSchema = assessmentIdParamsSchema;
