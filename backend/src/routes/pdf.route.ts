import { Router } from "express";
import {
    uploadPdfHandler,
    listPdfsHandler,
    getPdfHandler,
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

// View/Download PDF
pdfRoutes.get("/:filename/view", getPdfHandler);

// Generate roadmap for specific PDF
pdfRoutes.post("/:filename/roadmap", generateRoadmapHandler);

// Get roadmap for specific PDF
pdfRoutes.get("/:filename/roadmap", getRoadmapHandler);

// Explain topic (Gemini + YouTube)
pdfRoutes.post("/explain", explainTopicHandler);

// Delete PDF and related data
pdfRoutes.delete("/:filename", deletePdfHandler);

export default pdfRoutes;
