import { Router } from "express";
import {
    uploadPdfHandler,
    listPdfsHandler,
    getPdfMetadataHandler,
    viewPdfHandler,
    generateRoadmapHandler,
    getRoadmapHandler,
    deletePdfHandler,
    explainTopicHandler
} from "../controllers/pdf.controller";
import multer from "multer";

const upload = multer();

const pdfRoutes = Router();

// Upload PDF (without auto-generating roadmap)
pdfRoutes.post("/upload", upload.any(), uploadPdfHandler);

// List all PDFs
pdfRoutes.get("/", listPdfsHandler);

// Get specific PDF metadata
pdfRoutes.get("/:pdfId", getPdfMetadataHandler);

// View/Download PDF
pdfRoutes.get("/:pdfId/view", viewPdfHandler);

// Generate roadmap for specific PDF
pdfRoutes.post("/:pdfId/roadmap", generateRoadmapHandler);

// Get roadmap for specific PDF
pdfRoutes.get("/:pdfId/roadmap", getRoadmapHandler);

// Explain topic (Gemini + YouTube)
pdfRoutes.post("/:pdfId/topic/:unitIndex/:topicIndex/explain", explainTopicHandler);

// Delete PDF and related data
pdfRoutes.delete("/:pdfId", deletePdfHandler);

export default pdfRoutes;
