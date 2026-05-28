import fs from "fs";
import path from "path";
import AssessmentModel from "../../models/Assessment";
import AssessmentJobModel from "../../models/AssessmentJob";
import { RAW_DATA_PATH } from "../../constants/env";
import {
  BAD_REQUEST,
  FORBIDDEN,
  NOT_FOUND,
} from "../../constants/http";
import { AppError } from "../../utils/errors";
import { emitQueued } from "./assessment.socket";
import { enqueueAssessmentGeneration } from "./assessment.queue";
import { extractTextFromUpload } from "../../services/fileExtract.service";
import type { AssessmentJobData } from "./assessment.types";

const readMetadata = () => {
  const metadataPath = path.join(
    path.dirname(RAW_DATA_PATH),
    "metadata",
    "pdfs.json"
  );

  if (!fs.existsSync(metadataPath)) {
    return { pdfs: [] as Array<{ id: string; filename: string }> };
  }

  const data = fs.readFileSync(metadataPath, "utf-8");
  return JSON.parse(data) as { pdfs: Array<{ id: string; filename: string }> };
};

import { downloadFileFromSupabase } from "../../services/supabase.service";
import LibraryFile from "../../models/LibraryFile";
import mongoose from "mongoose";
import os from "os";

const resolveSourceContent = async (
  sourceType: "text" | "pdf" | "none",
  sourceContent: string,
  teacherId: string
) => {
  let finalSourceContent = sourceContent || "";

  if (sourceType === "pdf" && sourceContent) {
    let filePath = "";
    let isTempFile = false;

    // Check if sourceContent is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(sourceContent)) {
      const libraryFile = await LibraryFile.findOne({ _id: sourceContent, userId: teacherId });
      if (!libraryFile) {
        throw new AppError(NOT_FOUND, "Uploaded PDF file not found in library");
      }
      
      const fileName = libraryFile.filename || libraryFile.supabaseUrl.split('/').pop();
      if (!fileName) {
          throw new AppError(NOT_FOUND, "Invalid file metadata");
      }

      const ext = path.extname(fileName) || '.pdf';
      const arrayBuffer = await downloadFileFromSupabase("adept-files", fileName);
      filePath = path.join(os.tmpdir(), `assessment_download_${Date.now()}${ext}`);
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
      isTempFile = true;
    } else {
      // It's likely a base64 string sent from the frontend
      isTempFile = true;
      filePath = path.join(os.tmpdir(), `assessment_upload_${Date.now()}.pdf`);
      try {
        fs.writeFileSync(filePath, Buffer.from(sourceContent, "base64"));
      } catch (err) {
        throw new AppError(BAD_REQUEST, "Invalid PDF content provided");
      }
    }

    try {
      const mime = filePath.match(/\.(jpg|jpeg|png)$/i) ? "image/jpeg" : "application/pdf";
      finalSourceContent = await extractTextFromUpload(filePath, mime);
    } finally {
      if (isTempFile && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } else if (sourceType === "text" && sourceContent) {
    // If it's pure text, just use it directly
    finalSourceContent = sourceContent;
  }

  return finalSourceContent;
};

export const createAssessment = async (
  teacherId: string | undefined,
  payload: {
    title: string;
    subject: string;
    duration: number;
    totalQuestions: number;
    totalMarks: number;
    questionTypes: string[];
    difficultyDistribution: { easy: number; medium: number; hard: number };
    dueDate?: Date;
    instructions?: string;
    sourceType: "text" | "pdf" | "none";
    sourceContent: string;
  }
) => {
  if (!teacherId) {
    throw new AppError(FORBIDDEN, "Not authorized");
  }

  const finalSourceContent = await resolveSourceContent(
    payload.sourceType,
    payload.sourceContent,
    teacherId
  );

  const assessment = new AssessmentModel({
    ...payload,
    teacherId,
    sourceContent: finalSourceContent,
    status: "draft",
  });
  await assessment.save();

  const jobPayload: AssessmentJobData = {
    assessmentId: assessment.id,
    teacherId: teacherId.toString(),
    sourceType: payload.sourceType,
    sourceContent: finalSourceContent,
    config: {
      questionTypes: payload.questionTypes,
      totalQuestions: payload.totalQuestions,
      totalMarks: payload.totalMarks,
      difficultyDistribution: payload.difficultyDistribution,
      instructions: payload.instructions || "",
      subject: payload.subject,
      duration: payload.duration,
    },
  };

  const { jobId } = await enqueueAssessmentGeneration(jobPayload);

  await new AssessmentJobModel({
    jobId,
    assessmentId: assessment.id,
    teacherId,
    status: "queued",
    progress: 0,
  }).save();

  assessment.status = "queued";
  assessment.jobId = jobId;
  await assessment.save();

  emitQueued(jobId, assessment.id);

  const difficultyTotal =
    payload.difficultyDistribution.easy +
    payload.difficultyDistribution.medium +
    payload.difficultyDistribution.hard;

  const warning =
    difficultyTotal !== payload.totalQuestions
      ? "difficultyDistribution does not sum to totalQuestions"
      : undefined;

  return { jobId, assessmentId: assessment.id, warning };
};

export const listAssessments = async (
  teacherId: string | undefined,
  page: number,
  limit: number
) => {
  if (!teacherId) {
    throw new AppError(FORBIDDEN, "Not authorized");
  }

  const skip = (page - 1) * limit;
  const assessments = await AssessmentModel.find({ teacherId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await AssessmentModel.countDocuments({ teacherId });

  return {
    assessments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAssessmentById = async (
  teacherId: string | undefined,
  id: string
) => {
  const assessment = await AssessmentModel.findById(id);

  if (!assessment) {
    throw new AppError(NOT_FOUND, "Assessment not found");
  }

  if (assessment.teacherId.toString() !== teacherId?.toString()) {
    throw new AppError(FORBIDDEN, "Access denied");
  }

  return assessment;
};

export const regenerateAssessment = async (
  teacherId: string | undefined,
  id: string
) => {
  const assessment = await getAssessmentById(teacherId, id);

  if (assessment.status === "queued" || assessment.status === "processing") {
    throw new AppError(BAD_REQUEST, "Assessment is already being processed");
  }

  const { jobId } = await enqueueAssessmentGeneration({
    assessmentId: assessment.id,
    teacherId: teacherId!.toString(),
    sourceType: assessment.sourceType,
    sourceContent: assessment.sourceContent || "",
    config: {
      questionTypes: assessment.questionTypes,
      totalQuestions: assessment.totalQuestions,
      totalMarks: assessment.totalMarks,
      difficultyDistribution: assessment.difficultyDistribution,
      instructions: assessment.instructions || "",
      subject: assessment.subject,
      duration: assessment.duration,
    },
  });

  await new AssessmentJobModel({
    jobId,
    assessmentId: assessment.id,
    teacherId,
    status: "queued",
    progress: 0,
  }).save();

  assessment.status = "queued";
  assessment.jobId = jobId;
  await assessment.save();

  emitQueued(jobId, assessment.id);

  return { jobId, assessmentId: assessment.id };
};

export const getAssessmentJobStatus = async (
  teacherId: string | undefined,
  jobId: string
) => {
  const job = await AssessmentJobModel.findOne({ jobId });

  if (!job) {
    throw new AppError(NOT_FOUND, "Job not found");
  }

  if (job.teacherId.toString() !== teacherId?.toString()) {
    throw new AppError(FORBIDDEN, "Access denied");
  }

  return {
    status: job.status,
    progress: job.progress,
    errorMessage: job.errorMessage,
  };
};

export const deleteAssessment = async (
  teacherId: string | undefined,
  id: string
) => {
  const assessment = await getAssessmentById(teacherId, id);
  await AssessmentModel.deleteOne({ _id: assessment.id });
  await AssessmentJobModel.deleteMany({ assessmentId: assessment.id });
  return { message: "Assessment deleted successfully" };
};
