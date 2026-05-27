import { CREATED, NOT_FOUND } from "../../constants/http";
import { sendSuccess } from "../../utils/response";
import { generateLessonPlan, generateRubric } from "./toolkit.service";
import { AppError } from "../../utils/errors";
import RubricModel from "../../models/Rubric";
import { createRubricPDFStream } from "../../services/pdf.service";

export const generateLessonPlanHandler = async (req: any, res: any) => {
  const data = await generateLessonPlan(req.body);
  sendSuccess(res, data, CREATED);
};

export const generateRubricHandler = async (req: any, res: any) => {
  const data = await generateRubric(req.userId, req.body);
  sendSuccess(res, data, CREATED);
};

export const downloadRubricPdfHandler = async (req: any, res: any) => {
  const rubric = await RubricModel.findOne({
    _id: req.params.id,
    teacherId: req.userId,
  });

  if (!rubric) {
    throw new AppError(NOT_FOUND, "Rubric not found");
  }

  try {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rubric-${rubric.id}.pdf"`
    );

    const stream = createRubricPDFStream(rubric);
    stream.on("error", (err: any) => {
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
