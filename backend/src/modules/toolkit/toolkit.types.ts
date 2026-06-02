import { z } from "zod";

export const LessonPlanRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  subject: z.string().min(1, "Subject is required"),
  gradeLevel: z.string().min(1, "Grade level is required"),
  duration: z.number().min(1, "Duration must be positive"),
  objectives: z.string().optional(),
  teachingStyle: z.enum(["lecture", "activity-based", "discussion", "mixed"]).default("mixed"),
});

export type LessonPlanRequest = z.infer<typeof LessonPlanRequestSchema>;

export const RubricRequestSchema = z.object({
  assignmentTitle: z.string().min(1, "Assignment title is required"),
  assignmentType: z.enum(["essay", "project", "presentation", "lab-report", "creative", "other"]),
  gradeLevel: z.string().min(1, "Grade level is required"),
  totalMarks: z.number().min(10, "Total marks must be at least 10"),
  criteria: z.string().optional(),
  performanceLevels: z.number().min(3).max(5).default(4),
});

export type RubricRequest = z.infer<typeof RubricRequestSchema>;

export const PresentationRequestSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  fileIds: z.array(z.string()).min(1, "At least one file must be selected"),
  slideCount: z.number().min(4).max(15).default(8),
  topicFocus: z.string().optional(),
});

export type PresentationRequest = z.infer<typeof PresentationRequestSchema>;

export const QuestionBankRequestSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  fileIds: z.array(z.string()).min(1, "At least one file must be selected"),
  questionCount: z.number().min(3).max(25).default(10),
  questionTypes: z.array(z.enum(["mcq", "short", "long"])).min(1, "At least one question type is required"),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
  topicFocus: z.string().optional(),
});

export type QuestionBankRequest = z.infer<typeof QuestionBankRequestSchema>;

