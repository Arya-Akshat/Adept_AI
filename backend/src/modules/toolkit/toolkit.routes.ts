import { Router } from "express";
import authenticate from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import asyncHandler from "../../utils/asyncHandler";
import { aiLimiter } from "../../middleware/rateLimiter.middleware";
import {
  generateLessonPlanHandler,
  generateRubricHandler,
  downloadRubricPdfHandler,
  generatePresentationHandler,
  downloadPresentationPptxHandler,
  getPresentationHandler,
  generateQuestionBankHandler,
  getQuestionBankHandler,
} from "./toolkit.controller";
import {
  LessonPlanRequestSchema,
  RubricRequestSchema,
  PresentationRequestSchema,
  QuestionBankRequestSchema,
} from "./toolkit.types";

const router = Router();

// Apply auth middleware to all toolkit routes
router.use(authenticate);

// 1. Generate Lesson Plan (synchronous Groq call)
router.post(
  "/lesson-plan",
  aiLimiter,
  validate(LessonPlanRequestSchema),
  asyncHandler(generateLessonPlanHandler)
);

// 2. Generate Rubric (synchronous Groq call + saves to DB)
router.post(
  "/rubric",
  aiLimiter,
  validate(RubricRequestSchema),
  asyncHandler(generateRubricHandler)
);

// 3. Download Rubric PDF
router.get(
  "/rubric/:id/pdf",
  asyncHandler(downloadRubricPdfHandler)
);

// 4. Get Slide Presentation Details
router.get(
  "/presentation/:id",
  asyncHandler(getPresentationHandler)
);

// 5. Generate Slide Presentation (synchronous Groq call)
router.post(
  "/presentation",
  aiLimiter,
  validate(PresentationRequestSchema),
  asyncHandler(generatePresentationHandler)
);

// 6. Download PowerPoint File (stateless binary PPTX compilation)
router.post(
  "/presentation/download",
  asyncHandler(downloadPresentationPptxHandler)
);

// 7. Get Question Bank Details
router.get(
  "/question-bank/:id",
  asyncHandler(getQuestionBankHandler)
);

// 8. Generate Question Bank (synchronous Groq call)
router.post(
  "/question-bank",
  aiLimiter,
  validate(QuestionBankRequestSchema),
  asyncHandler(generateQuestionBankHandler)
);

export default router;

