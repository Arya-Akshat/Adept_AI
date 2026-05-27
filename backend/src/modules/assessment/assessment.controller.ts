import { CREATED, BAD_REQUEST, OK } from "../../constants/http";
import { sendSuccess } from "../../utils/response";
import {
  createAssessment,
  deleteAssessment,
  getAssessmentById,
  getAssessmentJobStatus,
  listAssessments,
  regenerateAssessment,
} from "./assessment.service";
import { AppError } from "../../utils/errors";
import { createAssessmentPDFStream } from "../../services/pdf.service";

import { redisClient } from "../../config/redis";

export const createAssessmentHandler = async (req: any, res: any) => {
  if (!redisClient) {
    throw new AppError(503, "Assessment generation is temporarily disabled (Redis missing on Render).");
  }

  const result = await createAssessment(req.userId, req.body);
  const responseBody: Record<string, unknown> = {
    success: true,
    data: {
      jobId: result.jobId,
      assessmentId: result.assessmentId,
    },
  };

  if (result.warning) {
    responseBody.warning = result.warning;
  }

  res.status(CREATED).json(responseBody);
};

export const listAssessmentsHandler = async (req: any, res: any) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const data = await listAssessments(req.userId, page, limit);
  sendSuccess(res, data);
};

export const getAssessmentHandler = async (req: any, res: any) => {
  const assessment = await getAssessmentById(req.userId, req.params.id);
  sendSuccess(res, assessment);
};

export const regenerateAssessmentHandler = async (req: any, res: any) => {
  if (!redisClient) {
    throw new AppError(503, "Assessment regeneration is temporarily disabled (Redis missing on Render).");
  }
  const data = await regenerateAssessment(req.userId, req.params.id);
  sendSuccess(res, data);
};

export const getAssessmentJobStatusHandler = async (req: any, res: any) => {
  const data = await getAssessmentJobStatus(req.userId, req.params.jobId);
  sendSuccess(res, data);
};

export const deleteAssessmentHandler = async (req: any, res: any) => {
  const data = await deleteAssessment(req.userId, req.params.id);
  sendSuccess(res, data);
};

export const downloadAssessmentPdfHandler = async (req: any, res: any) => {
  const assessment = await getAssessmentById(req.userId, req.params.id);

  if (assessment.status !== "completed" || !assessment.generatedPaper) {
    throw new AppError(
      BAD_REQUEST,
      "Assessment question paper is not generated or complete yet"
    );
  }

  try {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="assessment-${assessment.id}.pdf"`
    );

    const stream = createAssessmentPDFStream(assessment.generatedPaper as any);
    stream.on("error", (err) => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: `PDF generation failed: ${err.message}`,
          },
        });
      } else {
        res.destroy(err);
      }
    });
    stream.pipe(res);
  } catch (err: any) {
    throw new AppError(500, `PDF generation failed: ${err.message}`);
  }
};
