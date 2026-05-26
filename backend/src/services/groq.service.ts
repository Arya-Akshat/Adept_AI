import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../config/env";
import logger from "../utils/logger";
import { AIGenerationError } from "../utils/errors";

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

export type RawAssessmentResponse = string;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateAssessment = async (
  prompt: string
): Promise<RawAssessmentResponse> => {
  let attempts = 0;
  const maxRetries = 2;
  const retryDelayMs = 2000;
  let useFallback = false;

  while (attempts <= maxRetries) {
    attempts++;
    const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
    logger.info(
      { model, attempt: attempts },
      "Groq AI: Sending generation request"
    );

    try {
      const responsePromise = groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert assessment creator. You must generate high-quality assessment papers strictly in the requested JSON format. Do not write any markdown code fences, do not write any introductory or concluding text, write only the raw JSON string.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Groq API request timeout")), 60000)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Groq API returned an empty response content.");
      }

      logger.info({ model }, "Groq AI: Generation successful");
      return content;
    } catch (error: any) {
      const isRateLimit = error.status === 429 || error.statusCode === 429;
      const isTimeout = error.message && error.message.includes("timeout");

      logger.warn(
        {
          model,
          attempt: attempts,
          error: error.message,
          isRateLimit,
          isTimeout,
        },
        "Groq AI: Request failed"
      );

      if (isRateLimit || isTimeout) {
        if (attempts <= maxRetries) {
          logger.info(`Groq AI: Retrying in ${retryDelayMs}ms...`);
          useFallback = true;
          await sleep(retryDelayMs);
          continue;
        }
      }

      throw new AIGenerationError(
        `AI generation failed after ${attempts} attempts: ${error.message}`
      );
    }
  }

  throw new AIGenerationError("AI generation failed: Max retries exceeded");
};
