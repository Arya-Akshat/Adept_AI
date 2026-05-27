import { Router } from "express";
import authenticate from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import asyncHandler from "../../utils/asyncHandler";
import {
  generateLessonPlanHandler,
  generateRubricHandler,
  downloadRubricPdfHandler,
} from "./toolkit.controller";
import {
  LessonPlanRequestSchema,
  RubricRequestSchema,
} from "./toolkit.types";

const router = Router();

// Apply auth middleware to all toolkit routes
router.use(authenticate);

// 1. Generate Lesson Plan (synchronous Groq call)
router.post(
  "/lesson-plan",
  validate(LessonPlanRequestSchema),
  asyncHandler(generateLessonPlanHandler)
);

// 2. Generate Rubric (synchronous Groq call + saves to DB)
router.post(
  "/rubric",
  validate(RubricRequestSchema),
  asyncHandler(generateRubricHandler)
);

// 3. Download Rubric PDF
router.get(
  "/rubric/:id/pdf",
  asyncHandler(downloadRubricPdfHandler)
);

export default router;
