import path from "path";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import fs from "fs";
import { RAW_DATA_PATH, PROCESSED_DATA_PATH } from "../constants/env";
import { API } from "../config/apiClient";
import PdfModel from "../models/pdf.model";

// Upload PDF (without auto-generating roadmap)
export const uploadPdfHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    appAssert(files && files.length > 0, BAD_REQUEST, "No files sent");

    const uploadedFiles = [];

    for (const file of files) {
        // Create DB entry
        const newPdf = await PdfModel.create({
            filename: file.filename,
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
    const pdfEntry = await PdfModel.findOne({ filename });
    appAssert(pdfEntry, NOT_FOUND, "PDF not found in database");

    // Check if file exists on disk
    const filePath = path.join(RAW_DATA_PATH, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(NOT_FOUND).json({ message: "PDF file missing from storage" });
    }

    // Call Flask API
    try {
        const response = await API.post("/get_roadmap", { filename });
        const roadmapData = response.data;

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

    const pdfEntry = await PdfModel.findOne({ filename });
    appAssert(pdfEntry, NOT_FOUND, "PDF not found");

    if (pdfEntry.roadmap) {
        return res.status(OK).json(pdfEntry.roadmap);
    }

    return res.status(NOT_FOUND).json({ message: "Roadmap not generated yet" });
});

// Explain Topic
export const explainTopicHandler = catchErrors(async (req, res) => {
    const { topic, context } = req.body;
    appAssert(topic, BAD_REQUEST, "Topic is required");

    try {
        const response = await API.post("/explain_topic", { topic, context });
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

    // Remove from DB
    const deletedPdf = await PdfModel.findOneAndDelete({ filename });
    appAssert(deletedPdf, NOT_FOUND, "PDF not found");

    // Remove file from disk
    const filePath = path.join(RAW_DATA_PATH, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return res.status(OK).json({ message: "PDF deleted successfully" });
});
