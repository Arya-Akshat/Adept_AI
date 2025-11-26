import path from "path";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import fs from "fs";
import { RAW_DATA_PATH, PROCESSED_DATA_PATH } from "../constants/env";
import { API } from "../config/apiClient";
import PdfModel from "../models/pdf.model";
import { v4 as uuidv4 } from "uuid";

// Upload PDF (without auto-generating roadmap)
export const uploadPdfHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    appAssert(files && files.length > 0, BAD_REQUEST, "No files sent");

    const uploadedFiles = [];

    for (const file of files) {
        const fileId = uuidv4();
        const ext = path.extname(file.originalname);
        const filename = `${fileId}${ext}`;
        const filePath = path.join(RAW_DATA_PATH, filename);

        // Save file to disk (required for Flask)
        fs.writeFileSync(filePath, file.buffer);

        // Create DB entry
        const newPdf = await PdfModel.create({
            filename: filename,
            originalName: file.originalname,
            uploadDate: new Date()
        });
        uploadedFiles.push(newPdf);
    }

    return res.status(OK).json({
        message: "PDFs uploaded successfully",
        files: uploadedFiles
    });
});

// List all PDFs
export const listPdfsHandler = catchErrors(async (req, res) => {
    const pdfs = await PdfModel.find().sort({ uploadDate: -1 });
    return res.status(OK).json(pdfs);
});

// Get PDF file content
export const getPdfHandler = catchErrors(async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(RAW_DATA_PATH, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(NOT_FOUND).json({ message: "PDF file not found" });
    }

    res.sendFile(filePath);
});

// Generate Roadmap (Triggered manually)
export const generateRoadmapHandler = catchErrors(async (req, res) => {
    const { filename } = req.params;

    // Check if PDF exists in DB
    // We accept either filename or _id. Let's try to find by filename first.
    let pdfEntry = await PdfModel.findOne({ filename });

    // If not found by filename, try by _id (if filename is a valid ObjectId)
    if (!pdfEntry && filename.match(/^[0-9a-fA-F]{24}$/)) {
        pdfEntry = await PdfModel.findById(filename);
    }

    appAssert(pdfEntry, NOT_FOUND, "PDF not found in database");

    // Check if file exists on disk
    const filePath = path.join(RAW_DATA_PATH, pdfEntry.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(NOT_FOUND).json({ message: "PDF file missing from storage" });
    }

    // Call Flask API
    try {
        const response = await API.get(`/getRoadmap?filename=${pdfEntry.filename}`);
        const roadmapData = (response.data as any).body; // Flask returns { body: ... }

        // Save roadmap to DB
        pdfEntry.roadmap = roadmapData;
        await pdfEntry.save();

        return res.status(OK).json(roadmapData);
    } catch (error: any) {
        console.error("Flask API Error:", error.response?.data || error.message);
        return res.status(INTERNAL_SERVER_ERROR).json({
            message: "Failed to generate roadmap",
            error: error.response?.data || error.message
        });
    }
});

// Get Roadmap (from DB)
export const getRoadmapHandler = catchErrors(async (req, res) => {
    const { filename } = req.params;

    let pdfEntry = await PdfModel.findOne({ filename });
    if (!pdfEntry && filename.match(/^[0-9a-fA-F]{24}$/)) {
        pdfEntry = await PdfModel.findById(filename);
    }

    appAssert(pdfEntry, NOT_FOUND, "PDF not found");

    if (pdfEntry.roadmap) {
        return res.status(OK).json(pdfEntry.roadmap);
    }

    return res.status(NOT_FOUND).json({ message: "Roadmap not generated yet" });
});

// Explain Topic
export const explainTopicHandler = catchErrors(async (req, res) => {
    const { pdfId, topicTitle, topicSummary } = req.body;
    appAssert(pdfId && topicTitle, BAD_REQUEST, "pdfId and topicTitle are required");

    // Find PDF
    const pdfEntry = await PdfModel.findById(pdfId);
    appAssert(pdfEntry, NOT_FOUND, "PDF not found");

    try {
        const response = await API.post("/explainTopic", {
            filename: pdfEntry.filename,
            topicTitle,
            topicSummary
        });
        return res.status(OK).json(response.data);
    } catch (error: any) {
        console.error("Flask API Error:", error.response?.data || error.message);
        return res.status(INTERNAL_SERVER_ERROR).json({
            message: "Failed to explain topic",
            error: error.response?.data || error.message
        });
    }
});

// Delete PDF
export const deletePdfHandler = catchErrors(async (req, res) => {
    const { filename } = req.params;

    let pdfEntry = await PdfModel.findOne({ filename });
    if (!pdfEntry && filename.match(/^[0-9a-fA-F]{24}$/)) {
        pdfEntry = await PdfModel.findById(filename);
    }

    appAssert(pdfEntry, NOT_FOUND, "PDF not found");

    // Remove from DB
    await pdfEntry.deleteOne();

    // Remove file from disk
    const filePath = path.join(RAW_DATA_PATH, pdfEntry.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return res.status(OK).json({ message: "PDF deleted successfully" });
});
