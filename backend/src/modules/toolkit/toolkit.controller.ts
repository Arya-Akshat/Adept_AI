import { CREATED, NOT_FOUND, BAD_REQUEST } from "../../constants/http";
import { sendSuccess } from "../../utils/response";
import { generateLessonPlan, generateRubric, generatePresentation } from "./toolkit.service";
import { AppError } from "../../utils/errors";
import RubricModel from "../../models/Rubric";
import { createRubricPDFStream } from "../../services/pdf.service";
import appAssert from "../../utils/appAssert";

export const generateLessonPlanHandler = async (req: any, res: any) => {
  const data = await generateLessonPlan(req.body);
  sendSuccess(res, data, CREATED);
};

export const generateRubricHandler = async (req: any, res: any) => {
  const data = await generateRubric(req.userId, req.body);
  sendSuccess(res, data, CREATED);
};

export const generatePresentationHandler = async (req: any, res: any) => {
  const data = await generatePresentation(req.userId, req.body);
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

import { createPresentationBuffer } from "../../services/pptx.service";

export const downloadPresentationPptxHandler = async (req: any, res: any) => {
  const { metadata, slides } = req.body;
  appAssert(metadata && slides && slides.length > 0, BAD_REQUEST, "Invalid presentation slides data");

  try {
    const buffer = await createPresentationBuffer({ metadata, slides });
    const safeTitle = (metadata.title || "presentation").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeTitle}.pptx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    throw new AppError(500, `PowerPoint generation failed: ${err.message}`);
  }
};
