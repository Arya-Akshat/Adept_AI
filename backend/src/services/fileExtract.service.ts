import fs from "fs";
import { PDFParse } from "pdf-parse";
import axios from "axios";
import logger from "../utils/logger";
import { AppError } from "../utils/errors";
import { BAD_REQUEST } from "../constants/http";
import { MAX_SOURCE_CONTENT_CHARS, GEMINI_API_KEY } from "../config/env";

const extractTextFromImageUsingGemini = async (filePath: string): Promise<string> => {
  logger.info({ filePath }, "FileExtract: Extracting text from image using Gemini API");
  
  if (!GEMINI_API_KEY) {
    throw new AppError(500, "GEMINI_API_KEY is not defined in environment variables");
  }

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");
    
    let mimeType = "image/png";
    if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: [
        {
          parts: [
            {
              text: "Extract all visible topics, syllabus items, question text, and educational content from this image. Return only the plain extracted text, keeping sections structured, but do not add conversational preamble."
            },
            {
              inlineData: {
                mimeType,
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    const text = (response.data as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned empty or invalid content");
    }

    return text;
  } catch (error: any) {
    logger.error(
      { filePath, error: error.message },
      "FileExtract: Gemini image extraction failed"
    );
    throw new AppError(
      500,
      `Failed to extract text from image using Gemini: ${error.message}`
    );
  }
};

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

    if (filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
      extractedText = await extractTextFromImageUsingGemini(filePath);
    } else if (mimeType === "text/plain" || filePath.endsWith(".txt")) {
      extractedText = fs.readFileSync(filePath, "utf-8");
    } else if (mimeType === "application/pdf" || filePath.endsWith(".pdf")) {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse(new Uint8Array(dataBuffer));
      const parsedData = await parser.getText();
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
