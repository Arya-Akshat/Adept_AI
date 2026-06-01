import { Router } from "express";
import authenticate from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import asyncHandler from "../../utils/asyncHandler";
import {
  generateLessonPlanHandler,
  generateRubricHandler,
  downloadRubricPdfHandler,
  generatePresentationHandler,
  downloadPresentationPptxHandler,
} from "./toolkit.controller";
import {
  LessonPlanRequestSchema,
  RubricRequestSchema,
  PresentationRequestSchema,
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

// 4. Generate Slide Presentation (synchronous Groq call)
router.post(
  "/presentation",
  validate(PresentationRequestSchema),
  asyncHandler(generatePresentationHandler)
);

// 5. Download PowerPoint File (stateless binary PPTX compilation)
router.post(
  "/presentation/download",
  asyncHandler(downloadPresentationPptxHandler)
);

export default router;
