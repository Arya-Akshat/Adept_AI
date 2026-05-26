// Choice: PDFKit is used because it has low memory overhead and does not require a headless browser.
import PDFDocument from "pdfkit";
import logger from "../utils/logger";
import type { GeneratedPaper } from "../modules/assessment/assessment.types";

const buildAssessmentPdfDocument = (paper: GeneratedPaper) => {
  logger.info(
    { subject: paper.metadata.subject },
    "PDFService: Starting PDF generation"
  );

  const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });

  doc.on("error", (err) => {
    logger.error({ error: err.message }, "PDFService: PDF generation failed");
  });

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("VEDA AI ACADEMY", { align: "center" });
  doc
    .fontSize(11)
    .font("Helvetica")
    .fillColor("#4a5568")
    .text("AI-Generated Model Assessment Paper", { align: "center" });
  doc.moveDown(1);

  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);

  const currentY = doc.y;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#1a202c")
    .text(`Subject: ${paper.metadata.subject}`, 50, currentY);
  doc.text(`Total Marks: ${paper.metadata.totalMarks} Marks`, 380, currentY);

  doc.moveDown(0.3);
  const nextY = doc.y;
  doc.text(`Duration: ${paper.metadata.duration} Minutes`, 50, nextY);
  doc.text(
    `Date: ${new Date(paper.metadata.generatedAt).toLocaleDateString()}`,
    380,
    nextY
  );
  doc.moveDown(0.8);

  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.6);

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#2d3748")
    .text("Student Name: _______________________", 50, doc.y, {
      continued: true,
    });
  doc.text("   Roll No: _____________", { continued: true });
  doc.text("   Section: _______");
  doc.moveDown(1.2);

  if (paper.metadata.instructions) {
    doc
      .fontSize(9)
      .font("Helvetica-Oblique")
      .fillColor("#4a5568")
      .text(`General Instructions: ${paper.metadata.instructions}`, 50, doc.y, {
        width: 495,
      });
    doc.moveDown(1.5);
  }

  let absoluteQuestionNum = 1;
  for (const section of paper.sections) {
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#1a202c")
      .text(section.title, 50, doc.y);
    doc
      .fontSize(9.5)
      .font("Helvetica-Oblique")
      .fillColor("#718096")
      .text(section.instruction);
    doc.moveDown(0.8);

    for (const question of section.questions) {
      if (doc.y > 720) {
        doc.addPage();
      }

      const qY = doc.y;

      doc.fontSize(10.5).font("Helvetica").fillColor("#2d3748");
      const questionText = `${question.questionNumber || absoluteQuestionNum}. ${
        question.text
      }`;
      doc.text(questionText, 50, qY, { width: 380 });

      const difficultyLabel = `[${question.difficulty.toUpperCase()}]`;
      const marksLabel = `[${question.marks} M]`;

      doc
        .fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#718096")
        .text(difficultyLabel, 440, qY, { align: "right", width: 50 });
      doc.fillColor("#1a202c").text(marksLabel, 500, qY, {
        align: "right",
        width: 45,
      });

      doc.moveDown(0.8);
      absoluteQuestionNum++;
    }
    doc.moveDown(1.2);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor("#a0aec0").text(
      `Page ${i + 1} of ${range.count}`,
      50,
      800,
      { align: "center", width: 495 }
    );
  }

  return doc;
};

export const createAssessmentPDFStream = (paper: GeneratedPaper) => {
  const doc = buildAssessmentPdfDocument(paper);
  process.nextTick(() => {
    doc.end();
    logger.info("PDFService: PDF generation completed successfully");
  });
  return doc;
};

export const generateAssessmentPDF = (paper: GeneratedPaper): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = buildAssessmentPdfDocument(paper);
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        logger.info("PDFService: PDF generation completed successfully");
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", (err) => {
        logger.error({ error: err.message }, "PDFService: PDF generation failed");
        reject(err);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
