import path from "path";
import fs from "fs";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../../constants/http";
import appAssert from "../../utils/appAssert";
import catchErrors from "../../utils/catchErrors";
import { RAW_DATA_PATH, PROCESSED_DATA_PATH } from "../../constants/env";
import { v4 as uuidv4 } from "uuid";
import logger from "../../utils/logger";
import { API } from "../../services/gemini.service";
import FormData from "form-data";

import LibraryFile from "../../models/LibraryFile";
import { uploadFileToSupabase, deleteFileFromSupabase } from "../../services/supabase.service";
import axios from "axios";

// Upload PDF (without auto-generating roadmap)
export const uploadPdfHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    appAssert(files && files.length > 0, BAD_REQUEST, "No files sent");

    const uploadedPdfs = [];

    for (const file of files) {
        const pdfId = uuidv4();
        const fileExtension = path.extname(file.originalname);
        const filename = `${pdfId}${fileExtension}`;

        // Upload to Supabase
        const publicUrl = await uploadFileToSupabase("adept-files", filename, file.buffer, file.mimetype);

        // Save to MongoDB
        const libraryFile = await LibraryFile.create({
            userId: req.userId,
            filename: filename,
            originalName: file.originalname,
            supabaseUrl: publicUrl,
            fileSize: file.size,
            isSyllabus: false,
            hasRoadmap: false
        });

        uploadedPdfs.push({
            id: libraryFile._id,
            userId: libraryFile.userId,
            filename: libraryFile.filename,
            originalName: libraryFile.originalName,
            uploadDate: libraryFile.uploadDate,
            fileSize: libraryFile.fileSize,
            hasRoadmap: libraryFile.hasRoadmap
        });
    }

    return res.status(OK).json({
        message: "PDF(s) uploaded successfully",
        pdfs: uploadedPdfs
    });
});

// List all PDFs
export const listPdfsHandler = catchErrors(async (req, res) => {
    const userPdfs = await LibraryFile.find({ userId: req.userId });
    
    // Map to old schema format for frontend compatibility
    const formattedPdfs = userPdfs.map(pdf => ({
        id: pdf._id,
        userId: pdf.userId,
        filename: pdf.filename,
        originalName: pdf.originalName,
        uploadDate: pdf.uploadDate,
        fileSize: pdf.fileSize,
        hasRoadmap: pdf.hasRoadmap,
        isSyllabus: pdf.isSyllabus,
        supabaseUrl: pdf.supabaseUrl
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
        filename: pdf.filename,
        originalName: pdf.originalName,
        uploadDate: pdf.uploadDate,
        fileSize: pdf.fileSize,
        hasRoadmap: pdf.hasRoadmap,
        isSyllabus: pdf.isSyllabus,
        supabaseUrl: pdf.supabaseUrl
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

// Generate roadmap for specific PDF (saves to cache)
export const generateRoadmapHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    let response;
    try {
        // Download the file from Supabase into memory
        const fileResponse = await axios.get(pdf.supabaseUrl, { responseType: 'arraybuffer' });
        
        const formData = new FormData();
        formData.append("userId", req.userId.toString());
        formData.append("pdf_file", Buffer.from(fileResponse.data as ArrayBuffer), { filename: pdf.filename });

        response = await API.post(`/getRoadmap`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });
    } catch (error: any) {
        logger.error({ error: error.response?.data || error.message }, "Flask API Error");
        throw new Error(error.response?.data?.error || "Roadmap generation failed in Flask");
    }

    appAssert(response, INTERNAL_SERVER_ERROR, "Roadmap generation failed");

    const roadmapData = (response.data as any).body;

    // Save roadmap directly to MongoDB
    pdf.hasRoadmap = true;
    pdf.roadmapData = roadmapData;
    await pdf.save();

    return res.status(OK).json({
        message: "Roadmap generated successfully",
        roadmap: roadmapData
    });
});

// Get roadmap for specific PDF (uses cache if available)
export const getRoadmapHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    // Check if roadmap exists in MongoDB
    if (pdf.hasRoadmap && pdf.roadmapData) {
        return res.status(OK).json({
            pdfId: pdfId,
            roadmap: pdf.roadmapData,
            cached: true
        });
    }

    // If no roadmap, generate new roadmap
    let response;
    try {
        // Download file from Supabase
        const fileResponse = await axios.get(pdf.supabaseUrl, { responseType: 'arraybuffer' });
        
        const formData = new FormData();
        formData.append("userId", req.userId.toString());
        formData.append("pdf_file", Buffer.from(fileResponse.data as ArrayBuffer), { filename: pdf.filename });

        response = await API.post(`/getRoadmap`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });
    } catch (error: any) {
        logger.error({ error: error.response?.data || error.message }, "Flask API Error");
        throw new Error(error.response?.data?.error || "Roadmap generation failed in Flask");
    }

    appAssert(response, INTERNAL_SERVER_ERROR, "Roadmap generation failed");

    const roadmapData = (response.data as any).body;

    // Save to MongoDB
    pdf.hasRoadmap = true;
    pdf.roadmapData = roadmapData;
    await pdf.save();

    return res.status(OK).json({
        pdfId: pdfId,
        roadmap: roadmapData,
        cached: false
    });
});

// Delete PDF and related data
export const deletePdfHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const pdf = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
    appAssert(pdf, NOT_FOUND, "PDF not found");

    // Delete from Supabase
    await deleteFileFromSupabase("adept-files", pdf.filename);

    // Delete from MongoDB
    await pdf.deleteOne();

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


