import fs from "fs";
import pdfParse from "pdf-parse";
import logger from "../utils/logger";
import { AppError } from "../utils/errors";
import { BAD_REQUEST } from "../constants/http";
import { MAX_SOURCE_CONTENT_CHARS } from "../config/env";

export const extractTextFromUpload = async (
  filePath: string,
  mimeType: string
): Promise<string> => {
  logger.info({ filePath, mimeType }, "FileExtract: Extracting text from file");

  if (!fs.existsSync(filePath)) {
    throw new AppError(404, "File not found on disk");
  }

  try {
    let extractedText = "";

    if (mimeType === "text/plain" || filePath.endsWith(".txt")) {
      extractedText = fs.readFileSync(filePath, "utf-8");
    } else if (mimeType === "application/pdf" || filePath.endsWith(".pdf")) {
      const dataBuffer = fs.readFileSync(filePath);
      const parsedData = await (pdfParse as any)(dataBuffer);
      extractedText = parsedData.text;
    } else {
      throw new AppError(
        BAD_REQUEST,
        `Unsupported mimeType for text extraction: ${mimeType}`
      );
    }

    const trimmedText = extractedText.slice(0, MAX_SOURCE_CONTENT_CHARS);
    logger.info(
      {
        filePath,
        originalLength: extractedText.length,
        extractedLength: trimmedText.length,
      },
      "FileExtract: Text extraction completed successfully"
    );

    return trimmedText;
  } catch (error: any) {
    logger.error(
      { filePath, error: error.message },
      "FileExtract: Text extraction failed"
    );
    throw new AppError(
      500,
      `Failed to extract text from file: ${error.message}`
    );
  }
};
