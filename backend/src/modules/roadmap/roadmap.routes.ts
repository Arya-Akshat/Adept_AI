import { Router } from "express";
import {
  uploadPdfHandler,
  listPdfsHandler,
  getPdfMetadataHandler,
  viewPdfHandler,
  generateRoadmapHandler,
  getRoadmapHandler,
  deletePdfHandler,
  explainTopicHandler,
  getPdfStatusHandler,
  toggleTopicStudiedHandler,
} from "./roadmap.controller";
import multer from "multer";

const upload = multer();

const pdfRoutes = Router();

// Upload PDF (without auto-generating roadmap)
pdfRoutes.post("/upload", upload.any(), uploadPdfHandler);

// List all PDFs
pdfRoutes.get("/", listPdfsHandler);

// Get specific PDF metadata status/reconnect sync
pdfRoutes.get("/:pdfId/status", getPdfStatusHandler);

// Get specific PDF metadata
pdfRoutes.get("/:pdfId", getPdfMetadataHandler);

// View/Download PDF
pdfRoutes.get("/:pdfId/view", viewPdfHandler);

// Generate/Retry roadmap for specific PDF
pdfRoutes.post("/:pdfId/roadmap", generateRoadmapHandler);

// Get roadmap for specific PDF
pdfRoutes.get("/:pdfId/roadmap", getRoadmapHandler);

// Explain topic (Gemini + YouTube)
pdfRoutes.post("/:pdfId/topic/:unitIndex/:topicIndex/explain", explainTopicHandler);

// Toggle topic studied status
pdfRoutes.patch("/:pdfId/topic/studied", toggleTopicStudiedHandler);

// Assign file to course folder
import { assignFileToCourseHandler } from "../course/course.controller";
pdfRoutes.patch("/:pdfId/assign-course", assignFileToCourseHandler);

// Delete PDF and related data
pdfRoutes.delete("/:pdfId", deletePdfHandler);

export default pdfRoutes;
