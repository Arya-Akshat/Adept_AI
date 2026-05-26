import { Router } from "express";
import authenticate from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import asyncHandler from "../../utils/asyncHandler";
import { assessmentLimiter } from "../../middleware/rateLimiter.middleware";
import {
  createAssessmentHandler,
  deleteAssessmentHandler,
  downloadAssessmentPdfHandler,
  getAssessmentHandler,
  getAssessmentJobStatusHandler,
  listAssessmentsHandler,
  regenerateAssessmentHandler,
} from "./assessment.controller";
import {
  createAssessmentSchema,
  regenerateAssessmentParamsSchema,
} from "./assessment.schema";

const router = Router();

// Apply authenticate middleware to all routes in this router
router.use(authenticate);

// 1. Create Assessment
router.post(
  "/create",
  assessmentLimiter,
  validate(createAssessmentSchema),
  asyncHandler(createAssessmentHandler)
);

// 2. Get all assessments for teacher (with pagination)
router.get(
  "/",
  asyncHandler(listAssessmentsHandler)
);

// 3. Get single assessment
router.get(
  "/:id",
  asyncHandler(getAssessmentHandler)
);

// 4. Regenerate assessment
router.post(
  "/:id/regenerate",
  assessmentLimiter,
  validate(regenerateAssessmentParamsSchema, "params"),
  asyncHandler(regenerateAssessmentHandler)
);

// 5. Get job status
router.get(
  "/job/:jobId/status",
  asyncHandler(getAssessmentJobStatusHandler)
);

// 6. Delete assessment
router.delete(
  "/:id",
  asyncHandler(deleteAssessmentHandler)
);

// 7. Get assessment PDF
router.get(
  "/:id/pdf",
  asyncHandler(downloadAssessmentPdfHandler)
);

export default router;
