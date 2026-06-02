// Choice: PDFKit is used because it has low memory overhead and does not require a headless browser.
import PDFDocument from "pdfkit";
import logger from "../utils/logger";
import type { GeneratedPaper } from "../modules/assessment/assessment.types";
import type { RubricDocument } from "../models/Rubric";

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
    .text("ADEPT AI ACADEMY", { align: "center" });
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

      if (question.options && question.options.length > 0) {
        const optionX = 70;
        for (let oIdx = 0; oIdx < question.options.length; oIdx++) {
          if (doc.y > 740) {
            doc.addPage();
          }
          const label = String.fromCharCode(97 + oIdx) + ") ";
          doc
            .fontSize(9.5)
            .font("Helvetica")
            .fillColor("#4a5568")
            .text(`${label}${question.options[oIdx]}`, optionX, doc.y, { width: 360 });
          doc.moveDown(0.25);
        }
        doc.moveDown(0.5);
      }

      absoluteQuestionNum++;
    }
    doc.moveDown(1.2);
  }

  // Answer Key Section
  if (doc.y > 680) {
    doc.addPage();
  } else {
    doc.moveDown(2);
  }

  const dividerY = doc.y;
  doc
    .moveTo(50, dividerY)
    .lineTo(545, dividerY)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke();
  doc.moveDown(1);

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#1a202c")
    .text("ANSWER KEY", 50, doc.y);
  doc.moveDown(0.8);

  let ansNumber = 1;
  for (const section of paper.sections) {
    for (const question of section.questions) {
      if (doc.y > 730) {
        doc.addPage();
      }
      const qText = `Q${question.questionNumber || ansNumber}:`;
      const answerText = question.answer || "No answer key generated.";
      
      const qY = doc.y;
      doc
        .fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#2d3748")
        .text(qText, 50, qY, { width: 40 });
        
      doc
        .font("Helvetica")
        .fillColor("#4a5568")
        .text(answerText, 90, qY, { width: 450 });
        
      doc.moveDown(0.8);
      ansNumber++;
    }
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

const buildRubricPdfDocument = (rubric: RubricDocument) => {
  logger.info(
    { assignmentTitle: rubric.metadata.assignmentTitle },
    "PDFService: Starting Rubric PDF generation"
  );

  const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });

  doc.on("error", (err) => {
    logger.error({ error: err.message }, "PDFService: Rubric PDF generation failed");
  });

  // Title & Header
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("ADEPT AI ACADEMY", { align: "center" });
  doc
    .fontSize(11)
    .font("Helvetica")
    .fillColor("#4a5568")
    .text("AI-Generated Grading Rubric", { align: "center" });
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
    .text(`Assignment: ${rubric.metadata.assignmentTitle}`, 50, currentY);
  doc.text(`Total Marks: ${rubric.metadata.totalMarks} Marks`, 380, currentY);

  doc.moveDown(0.3);
  const nextY = doc.y;
  doc.text(`Type: ${rubric.metadata.assignmentType.toUpperCase()}`, 50, nextY);
  doc.text(`Grade Level: ${rubric.metadata.gradeLevel}`, 380, nextY);
  doc.moveDown(0.8);

  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke();
  doc.moveDown(1);

  // Table parameters
  const startX = 50;
  const endX = 545;
  const totalWidth = endX - startX; // 495
  const criteriaColWidth = 115;
  const levelsCount = rubric.criteria[0]?.levels.length || 4;
  const levelsColWidth = (totalWidth - criteriaColWidth) / levelsCount;

  const drawHeader = (startY: number) => {
    doc.rect(startX, startY, totalWidth, 25).fill("#f1f5f9");
    doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(9);
    
    // Draw vertical header text
    doc.text("Criteria", startX + 8, startY + 8, { width: criteriaColWidth - 16 });
    
    if (rubric.criteria[0]) {
      rubric.criteria[0].levels.forEach((lvl, idx) => {
        const colX = startX + criteriaColWidth + idx * levelsColWidth;
        doc.text(lvl.label, colX + 8, startY + 8, { width: levelsColWidth - 16, align: "center" });
      });
    }
    
    // Draw table border lines for header
    doc.lineWidth(1).strokeColor("#cbd5e1");
    // Outer rect
    doc.rect(startX, startY, totalWidth, 25).stroke();
    // Inner column dividers
    let currentX = startX + criteriaColWidth;
    for (let i = 0; i < levelsCount; i++) {
      doc.moveTo(currentX, startY).lineTo(currentX, startY + 25).stroke();
      currentX += levelsColWidth;
    }
    
    return startY + 25;
  };

  let tableY = doc.y;
  tableY = drawHeader(tableY);

  // Draw Criteria Rows
  rubric.criteria.forEach((crit, rIdx) => {
    // 1. Calculate row height based on text wrapping
    doc.font("Helvetica").fontSize(8.5);
    
    // First cell height
    const critTitle = crit.name;
    const critSub = `(${crit.weight}% | ${crit.marks} M)`;
    const cell1Height = doc.heightOfString(critTitle, { width: criteriaColWidth - 16 }) +
                        doc.heightOfString(critSub, { width: criteriaColWidth - 16 }) + 10;
                        
    // Level cells height
    let maxLevelHeight = 0;
    crit.levels.forEach((lvl) => {
      const lvlText = `[${lvl.score} M]\n${lvl.descriptor}`;
      const lvlHeight = doc.heightOfString(lvlText, { width: levelsColWidth - 16 });
      if (lvlHeight > maxLevelHeight) {
        maxLevelHeight = lvlHeight;
      }
    });
    
    const rowHeight = Math.max(cell1Height, maxLevelHeight) + 16; // 16px padding

    // Check page overflow
    if (tableY + rowHeight > 750) {
      doc.addPage();
      tableY = 50; // top margin of new page
      tableY = drawHeader(tableY);
    }

    // Alternating background
    if (rIdx % 2 === 1) {
      doc.rect(startX, tableY, totalWidth, rowHeight).fill("#f8fafc");
    }

    // Write text
    // 1. First column text
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9);
    doc.text(crit.name, startX + 8, tableY + 8, { width: criteriaColWidth - 16 });
    doc.fillColor("#64748b").font("Helvetica").fontSize(8);
    doc.text(`Weight: ${crit.weight}%\nMarks: ${crit.marks}`, startX + 8, doc.y + 4, { width: criteriaColWidth - 16 });

    // 2. Levels columns text
    crit.levels.forEach((lvl, idx) => {
      const colX = startX + criteriaColWidth + idx * levelsColWidth;
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
      doc.text(`${lvl.score} M`, colX + 8, tableY + 8, { width: levelsColWidth - 16, align: "center" });
      doc.fillColor("#334155").font("Helvetica").fontSize(8);
      doc.text(lvl.descriptor, colX + 8, doc.y + 4, { width: levelsColWidth - 16 });
    });

    // Draw borders
    doc.lineWidth(1).strokeColor("#cbd5e1");
    // Row border bottom
    doc.moveTo(startX, tableY + rowHeight).lineTo(endX, tableY + rowHeight).stroke();
    // Left & right borders
    doc.moveTo(startX, tableY).lineTo(startX, tableY + rowHeight).stroke();
    doc.moveTo(endX, tableY).lineTo(endX, tableY + rowHeight).stroke();
    
    // Vertical column dividers
    let currentX = startX + criteriaColWidth;
    for (let i = 0; i < crit.levels.length; i++) {
      doc.moveTo(currentX, tableY).lineTo(currentX, tableY + rowHeight).stroke();
      currentX += levelsColWidth;
    }

    tableY += rowHeight;
  });

  // Summary box
  doc.moveDown(1.5);
  if (doc.y > 700) {
    doc.addPage();
  }
  
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#1a202c")
    .text(`Total Rubric Weight: 100%`, 50, doc.y);
  doc.text(`Total Assignment Marks: ${rubric.metadata.totalMarks} Marks`, 50, doc.y + 15);

  // Footer: Page numbers
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

export const createRubricPDFStream = (rubric: RubricDocument) => {
  const doc = buildRubricPdfDocument(rubric);
  process.nextTick(() => {
    doc.end();
    logger.info("PDFService: Rubric PDF generation completed successfully");
  });
  return doc;
};
