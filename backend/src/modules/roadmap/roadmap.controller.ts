import path from "path";
import fs from "fs";
import os from "os";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../../constants/http";
import appAssert from "../../utils/appAssert";
import catchErrors from "../../utils/catchErrors";
import { AppError } from "../../utils/errors";
import { RAW_DATA_PATH, PROCESSED_DATA_PATH } from "../../constants/env";
import { v4 as uuidv4 } from "uuid";
import logger from "../../utils/logger";
import { API } from "../../services/gemini.service";
import FormData from "form-data";

import LibraryFile from "../../models/LibraryFile";
import { uploadFileToSupabase, deleteFileFromSupabase, downloadFileFromSupabase } from "../../services/supabase.service";
import { extractTextFromUpload } from "../../services/fileExtract.service";
import { getRoadmapQueue } from "../../queues";
import { emitRoadmapQueued, emitVectorQueued } from "./roadmap.socket";
import axios from "axios";

// Upload PDF (without auto-generating roadmap)
export const uploadPdfHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    appAssert(files && files.length > 0, BAD_REQUEST, "No files sent");
    appAssert(files[0].size > 100, BAD_REQUEST, "File is too small (likely corrupt or empty)");

    const file = files[0];
    const tempPdfId = uuidv4(); // Generate a UUID first to avoid concurrency naming clashes
    const fileExtension = path.extname(file.originalname);
    const filename = `${tempPdfId}${fileExtension}`;

    // Upload to Supabase
    const publicUrl = await uploadFileToSupabase("adept-files", filename, file.buffer, file.mimetype);

    // Save to temp file and extract text
    const ext = fileExtension || ".pdf";
    const tempPath = path.join(os.tmpdir(), `roadmap_upload_${Date.now()}${ext}`);
    fs.writeFileSync(tempPath, file.buffer);

    let extractedText = "";
    try {
        const mime = file.mimetype;
        extractedText = await extractTextFromUpload(tempPath, mime);
    } finally {
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }

    const fileType = file.mimetype.startsWith("image/") || ext.match(/\.(jpg|jpeg|png)$/i) ? "image" : "pdf";
    const vectorStatus = fileType === "pdf" ? "queued" : "na";
    const courseId = req.body.courseId || undefined;

    // Save to MongoDB
    const libraryFile = await LibraryFile.create({
        userId: req.userId,
        courseId,
        filename: filename,
        originalName: file.originalname,
        supabaseUrl: publicUrl,
        fileSize: file.size,
        isSyllabus: fileType === "image",
        hasRoadmap: false,
        roadmapStatus: "queued",
        vectorStatus,
    });

    const pdfId = (libraryFile._id as any).toString();

    // Queue BullMQ job
    const roadmapQueue = getRoadmapQueue();
    await roadmapQueue.add(`roadmap-gen-${pdfId}`, {
        pdfId,
        userId: req.userId.toString(),
        filePath: filename,
        extractedText,
        fileType
    });

    // Emit socket events
    emitRoadmapQueued(pdfId);
    if (vectorStatus === "queued") {
        emitVectorQueued(pdfId);
    }

    return res.status(OK).json({
        success: true,
        data: {
            pdfId,
            roadmapStatus: "queued",
            vectorStatus
        }
    });
});

// List all PDFs
export const listPdfsHandler = catchErrors(async (req, res) => {
    const userPdfs = await LibraryFile.find({ userId: req.userId });
    
    // Map to old schema format for frontend compatibility
    const formattedPdfs = userPdfs.map((pdf: any) => ({
        id: pdf._id,
        userId: pdf.userId,
        courseId: pdf.courseId,
        filename: pdf.filename,
        originalName: pdf.originalName,
        uploadDate: pdf.uploadDate,
        fileSize: pdf.fileSize,
        hasRoadmap: pdf.hasRoadmap,
        isSyllabus: pdf.isSyllabus,
        supabaseUrl: pdf.supabaseUrl,
        roadmapStatus: pdf.roadmapStatus,
        vectorStatus: pdf.vectorStatus,
        roadmapError: pdf.roadmapError,
        vectorError: pdf.vectorError
    }));
    
    return res.status(OK).json(formattedPdfs);
});

// Get specific PDF metadata
export const getPdfMetadataHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    return res.status(OK).json({
        id: pdf._id,
        userId: pdf.userId,
        courseId: pdf.courseId,
        filename: pdf.filename,
        originalName: pdf.originalName,
        uploadDate: pdf.uploadDate,
        fileSize: pdf.fileSize,
        hasRoadmap: pdf.hasRoadmap,
        isSyllabus: pdf.isSyllabus,
        supabaseUrl: pdf.supabaseUrl,
        roadmapStatus: pdf.roadmapStatus,
        vectorStatus: pdf.vectorStatus,
        roadmapError: pdf.roadmapError,
        vectorError: pdf.vectorError
    });
});

// View/Download PDF
export const viewPdfHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    // Redirect to the public Supabase URL so the browser can view it
    return res.redirect(pdf.supabaseUrl);
});

// Generate roadmap for specific PDF (saves to cache) - now used as retry / re-queue
export const generateRoadmapHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    const fileType = pdf.isSyllabus ? "image" : "pdf";
    pdf.roadmapStatus = "queued";
    pdf.roadmapError = undefined;
    if (fileType === "pdf") {
        pdf.vectorStatus = "queued";
        pdf.vectorError = undefined;
    }
    await pdf.save();

    // Download file from Supabase and extract text
    const arrayBuffer = await downloadFileFromSupabase("adept-files", pdf.filename);
    const ext = path.extname(pdf.filename) || ".pdf";
    const tempPath = path.join(os.tmpdir(), `roadmap_retry_${Date.now()}${ext}`);
    fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));

    let extractedText = "";
    try {
        const mime = pdf.isSyllabus ? "image/jpeg" : "application/pdf";
        extractedText = await extractTextFromUpload(tempPath, mime);
    } finally {
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }

    const roadmapQueue = getRoadmapQueue();
    await roadmapQueue.add(`roadmap-gen-${pdfId}`, {
        pdfId: (pdf._id as any).toString(),
        userId: req.userId.toString(),
        filePath: pdf.filename,
        extractedText,
        fileType
    });

    emitRoadmapQueued((pdf._id as any).toString());
    if (pdf.vectorStatus === "queued") {
        emitVectorQueued((pdf._id as any).toString());
    }

    return res.status(OK).json({
        success: true,
        data: {
            pdfId: (pdf._id as any).toString(),
            roadmapStatus: "queued",
            vectorStatus: pdf.vectorStatus
        }
    });
});

// Get roadmap for specific PDF (uses cache if available)
export const getRoadmapHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    if (pdf.roadmapStatus === "failed") {
        return res.status(INTERNAL_SERVER_ERROR).json({
            status: "failed",
            error: pdf.roadmapError || "Roadmap generation failed"
        });
    }

    if (pdf.roadmapStatus !== "ready") {
        return res.status(202).json({ status: pdf.roadmapStatus });
    }

    return res.status(OK).json({
        pdfId: pdfId,
        roadmap: pdf.roadmapData,
        cached: true
    });
});

// Get specific PDF roadmap status
export const getPdfStatusHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    return res.status(OK).json({
        pdfId: (pdf._id as any).toString(),
        roadmapStatus: pdf.roadmapStatus,
        vectorStatus: pdf.vectorStatus,
        roadmapError: pdf.roadmapError,
        vectorError: pdf.vectorError
    });
});

// Delete PDF and related data
export const deletePdfHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    // Delete from Supabase
    await deleteFileFromSupabase("adept-files", pdf.filename);

    // Delete related Assessments
    const AssessmentModel = (await import("../../models/Assessment")).default;
    await AssessmentModel.deleteMany({ sourceContent: pdfId, teacherId: req.userId });

    // Delete from MongoDB
    await pdf.deleteOne();

    // Call FastAPI to delete vectors (fire-and-forget)
    API.delete("/delete-document-vectors", { data: { pdfId } } as any)
        .catch((err: any) => {
            logger.error({ err: err.message, pdfId }, "Failed to delete document vectors from FastAPI");
        });

    return res.status(OK).json({
        message: "PDF and related data deleted successfully"
    });
});

// Explain topic (Generate explanation + YouTube videos)
export const explainTopicHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const { topicTitle, topicSummary } = req.body;

    appAssert(topicTitle, BAD_REQUEST, "Topic title is required");

    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    // Fetch the PDF from Supabase
    const fileResponse = await axios.get(pdf.supabaseUrl, { responseType: 'arraybuffer' });

    // Call Python to generate explanation
    const formData = new FormData();
    formData.append("topicTitle", topicTitle);
    if (topicSummary) formData.append("topicSummary", topicSummary);
    formData.append("pdf_file", Buffer.from(fileResponse.data as ArrayBuffer), { filename: pdf.filename });

    const response = await API.post("/explainTopic", formData, {
        headers: { ...formData.getHeaders() }
    });

    appAssert(response, INTERNAL_SERVER_ERROR, "Explanation generation failed");

    return res.status(OK).json({
        ...(response.data as any),
        cached: false // Not caching explanations for now since they are dynamic
    });
});

export const toggleTopicStudiedHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const { unitIndex, topicIndex, studied } = req.body;

    appAssert(unitIndex !== undefined && topicIndex !== undefined && studied !== undefined, BAD_REQUEST, "Missing unitIndex, topicIndex, or studied in body");

    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");
    appAssert(pdf.roadmapData, BAD_REQUEST, "Roadmap not generated yet");

    const unitStr = unitIndex.toString();
    const topicStr = topicIndex.toString();

    if (!pdf.roadmapData[unitStr]) {
        pdf.roadmapData[unitStr] = {};
    }
    if (!pdf.roadmapData[unitStr][topicStr]) {
        pdf.roadmapData[unitStr][topicStr] = {};
    }

    pdf.roadmapData[unitStr][topicStr].studied = studied;
    pdf.markModified("roadmapData");
    await pdf.save();

    return res.status(OK).json({
        success: true,
        data: {
            studied
        }
    });
});


