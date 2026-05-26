import { z } from "zod";
import logger from "../../utils/logger";
import { ParseError } from "../../utils/errors";
import type { GeneratedPaper } from "./assessment.types";

const QuestionSchema = z.object({
  questionNumber: z.number(),
  text: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  marks: z.number(),
  bloomLevel: z.string(),
  type: z.string(),
});

const SectionSchema = z.object({
  title: z.string(),
  instruction: z.string(),
  questions: z.array(QuestionSchema),
});

const PaperMetadataSchema = z.object({
  subject: z.string(),
  totalMarks: z.number(),
  duration: z.number(),
  generatedAt: z.preprocess((val) => {
    if (typeof val === "string" || val instanceof Date) return new Date(val);
    return val;
  }, z.date()),
  instructions: z.string(),
});

const GeneratedPaperSchema = z.object({
  metadata: PaperMetadataSchema,
  sections: z.array(SectionSchema),
});

export const parseAssessmentResponse = (raw: string): GeneratedPaper => {
  try {
    // 1. Attempt standard JSON parse
    const cleanRaw = raw.trim();
    const parsedObj = JSON.parse(cleanRaw);

    // 2. Validate against Zod schema
    const result = GeneratedPaperSchema.safeParse(parsedObj);
    if (!result.success) {
      const errorMsg = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ");
      logger.error(
        { raw: cleanRaw.slice(0, 500), errorMsg },
        "AI Parser: Schema validation failed"
      );
      throw new ParseError(`Schema validation failed: ${errorMsg}`);
    }

    return result.data as GeneratedPaper;
  } catch (error: any) {
    if (error instanceof ParseError) {
      throw error;
    }
    logger.error(
      { raw: raw.slice(0, 500), error: error.message },
      "AI Parser: JSON parsing failed"
    );
    throw new ParseError(`JSON parsing failed: ${error.message}`);
  }
};
