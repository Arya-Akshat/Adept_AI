import path from "path";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import fs from "fs";
import { RAW_DATA_PATH, PROCESSED_DATA_PATH } from "../constants/env";
import { API } from "../config/apiClient";
import { v4 as uuidv4 } from "uuid";

const METADATA_PATH = path.join(path.dirname(RAW_DATA_PATH), "metadata", "pdfs.json");

// Helper functions for metadata management
const readMetadata = () => {
    if (!fs.existsSync(METADATA_PATH)) {
        return { pdfs: [] };
    }
    const data = fs.readFileSync(METADATA_PATH, 'utf-8');
    return JSON.parse(data);
};

const writeMetadata = (metadata: any) => {
    fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 4));
};

// Upload PDF (without auto-generating roadmap)
export const uploadPdfHandler = catchErrors(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    appAssert(files && files.length > 0, BAD_REQUEST, "No files sent");

    const metadata = readMetadata();
    const uploadedPdfs = [];

    for (const file of files) {
        const pdfId = uuidv4();
        const fileExtension = path.extname(file.originalname);
        const filename = `${pdfId}${fileExtension}`;
        const filePath = path.join(RAW_DATA_PATH, filename);

        // Save file
        fs.writeFileSync(filePath, file.buffer);

        // Create metadata entry
        const pdfMetadata = {
            id: pdfId,
            filename: filename,
            originalName: file.originalname,
            uploadDate: new Date().toISOString(),
            fileSize: file.size,
            hasRoadmap: false
        };

        metadata.pdfs.push(pdfMetadata);
        uploadedPdfs.push(pdfMetadata);
    }

    writeMetadata(metadata);

    return res.status(OK).json({
        message: "PDF(s) uploaded successfully",
        pdfs: uploadedPdfs
    });
});

// List all PDFs
export const listPdfsHandler = catchErrors(async (req, res) => {
    const metadata = readMetadata();
    return res.status(OK).json(metadata.pdfs);
});

// Get specific PDF metadata
export const getPdfMetadataHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const metadata = readMetadata();

    const pdf = metadata.pdfs.find((p: any) => p.id === pdfId);
    appAssert(pdf, NOT_FOUND, "PDF not found");

    return res.status(OK).json(pdf);
});

// View/Download PDF
export const viewPdfHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const metadata = readMetadata();

    const pdf = metadata.pdfs.find((p: any) => p.id === pdfId);
    appAssert(pdf, NOT_FOUND, "PDF not found");

    const filePath = path.resolve(RAW_DATA_PATH, pdf.filename);
    appAssert(fs.existsSync(filePath), NOT_FOUND, "PDF file not found on disk");

    return res.sendFile(filePath);
});

// Generate roadmap for specific PDF (saves to cache)
export const generateRoadmapHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const metadata = readMetadata();

    const pdf = metadata.pdfs.find((p: any) => p.id === pdfId);
    appAssert(pdf, NOT_FOUND, "PDF not found");

    const filePath = path.join(RAW_DATA_PATH, pdf.filename);
    appAssert(fs.existsSync(filePath), NOT_FOUND, "PDF file not found on disk");

    // Call Flask to generate roadmap with specific filename
    let response;
    try {
        response = await API.get(`/getRoadmap?filename=${pdf.filename}`);
    } catch (error: any) {
        console.error("Flask API Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Roadmap generation failed in Flask");
    }

    appAssert(response, INTERNAL_SERVER_ERROR, "Roadmap generation failed");

    const roadmapData = (response.data as any).body;

    // Save roadmap to cache
    const roadmapPath = path.join(PROCESSED_DATA_PATH, `${pdfId}_roadmap.json`);
    fs.writeFileSync(roadmapPath, JSON.stringify(roadmapData, null, 4));

    // Update metadata
    pdf.hasRoadmap = true;
    pdf.lastRoadmapGeneration = new Date().toISOString();
    writeMetadata(metadata);

    return res.status(OK).json({
        message: "Roadmap generated successfully",
        roadmap: roadmapData
    });
});

// Get roadmap for specific PDF (uses cache if available)
export const getRoadmapHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const metadata = readMetadata();

    const pdf = metadata.pdfs.find((p: any) => p.id === pdfId);
    appAssert(pdf, NOT_FOUND, "PDF not found");

    const roadmapPath = path.join(PROCESSED_DATA_PATH, `${pdfId}_roadmap.json`);

    // Check if cached roadmap exists
    if (fs.existsSync(roadmapPath)) {
        const roadmapData = JSON.parse(fs.readFileSync(roadmapPath, 'utf-8'));
        return res.status(OK).json({
            pdfId: pdfId,
            roadmap: roadmapData,
            cached: true
        });
    }

    // If no cache, generate new roadmap
    const filePath = path.join(RAW_DATA_PATH, pdf.filename);
    appAssert(fs.existsSync(filePath), NOT_FOUND, "PDF file not found on disk");

    let response;
    try {
        response = await API.get(`/getRoadmap?filename=${pdf.filename}`);
    } catch (error: any) {
        console.error("Flask API Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Roadmap generation failed in Flask");
    }

    appAssert(response, INTERNAL_SERVER_ERROR, "Roadmap generation failed");

    const roadmapData = (response.data as any).body;

    // Save to cache
    fs.writeFileSync(roadmapPath, JSON.stringify(roadmapData, null, 4));

    // Update metadata
    pdf.hasRoadmap = true;
    pdf.lastRoadmapGeneration = new Date().toISOString();
    writeMetadata(metadata);

    return res.status(OK).json({
        pdfId: pdfId,
        roadmap: roadmapData,
        cached: false
    });
});

// Delete PDF and related data
export const deletePdfHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const metadata = readMetadata();

    const pdfIndex = metadata.pdfs.findIndex((p: any) => p.id === pdfId);
    appAssert(pdfIndex !== -1, NOT_FOUND, "PDF not found");

    const pdf = metadata.pdfs[pdfIndex];

    // Delete PDF file
    const pdfPath = path.join(RAW_DATA_PATH, pdf.filename);
    if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
    }

    // Delete roadmap if exists
    const roadmapPath = path.join(PROCESSED_DATA_PATH, `${pdfId}_roadmap.json`);
    if (fs.existsSync(roadmapPath)) {
        fs.unlinkSync(roadmapPath);
    }

    // Remove from metadata
    metadata.pdfs.splice(pdfIndex, 1);
    writeMetadata(metadata);

    return res.status(OK).json({
        message: "PDF and related data deleted successfully"
    });
});

// Explain topic (Generate explanation + YouTube videos)
export const explainTopicHandler = catchErrors(async (req, res) => {
    const { pdfId } = req.params;
    const { topicTitle, topicSummary } = req.body;

    appAssert(topicTitle, BAD_REQUEST, "Topic title is required");

    const metadata = readMetadata();
    const pdf = metadata.pdfs.find((p: any) => p.id === pdfId);
    appAssert(pdf, NOT_FOUND, "PDF not found");

    // Create a safe filename for the cache
    const safeTitle = topicTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const cacheFilename = `${pdfId}_${safeTitle}_explanation.json`;
    const cachePath = path.join(PROCESSED_DATA_PATH, "explanations");

    // Ensure explanations directory exists
    if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
    }

    const fullCachePath = path.join(cachePath, cacheFilename);

    // Check cache first
    if (fs.existsSync(fullCachePath)) {
        const cachedData = JSON.parse(fs.readFileSync(fullCachePath, 'utf-8'));
        return res.status(OK).json({
            ...cachedData,
            cached: true
        });
    }

    const filePath = path.join(RAW_DATA_PATH, pdf.filename);
    appAssert(fs.existsSync(filePath), NOT_FOUND, "PDF file not found on disk");

    // Call Flask to generate explanation
    const response = await API.post("/explainTopic", {
        filename: pdf.filename,
        topicTitle,
        topicSummary: topicSummary || ""
    });

    appAssert(response, INTERNAL_SERVER_ERROR, "Explanation generation failed");

    const explanationData = response.data;

    // Save to cache
    fs.writeFileSync(fullCachePath, JSON.stringify(explanationData, null, 4));

    return res.status(OK).json({
        ...(explanationData as any),
        cached: false
    });
});
