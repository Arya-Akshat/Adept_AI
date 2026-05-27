import { MAX_SOURCE_CONTENT_CHARS } from "../../config/env";
import type { AssessmentJobData } from "./assessment.types";

export const buildAssessmentPrompt = (jobData: AssessmentJobData): string => {
  const { config, sourceType, sourceContent } = jobData;
  const {
    subject,
    totalQuestions,
    totalMarks,
    duration,
    questionTypes,
    difficultyDistribution,
    instructions,
  } = config;

  let sourceMaterialSection = "";
  if (sourceType !== "none" && sourceContent) {
    const trimmedContent = sourceContent.slice(0, MAX_SOURCE_CONTENT_CHARS);
    sourceMaterialSection = `
SOURCE MATERIAL (Use this content to base the questions on):
---
${trimmedContent}
---
`;
  }

  return `
Create a structured assessment question paper based on the following configuration:

SUBJECT: ${subject}
TOTAL QUESTIONS: ${totalQuestions}
TOTAL MARKS: ${totalMarks}
DURATION: ${duration} minutes
QUESTION TYPES REQUESTED: ${questionTypes.join(", ")}
DIFFICULTY DISTRIBUTION:
- Easy questions: ${difficultyDistribution.easy}
- Medium questions: ${difficultyDistribution.medium}
- Hard questions: ${difficultyDistribution.hard}

ADDITIONAL INSTRUCTIONS: ${instructions || "None"}
${sourceMaterialSection}

INSTRUCTIONS FOR GENERATION:
1. Divide the questions into logical sections based on question types (e.g. "Section A" for Multiple Choice, "Section B" for Short Answer, "Section C" for Long Answer/Essay).
2. For each question, ensure you assign a Bloom's Taxonomy level (e.g., "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create").
3. Make sure the sum of questions matches exactly ${totalQuestions}.
4. Make sure the sum of marks of all questions matches exactly ${totalMarks} marks.
5. Provide a clear instruction for each section.
6. The difficulty of each question must strictly match the distribution: exactly ${difficultyDistribution.easy} easy, ${difficultyDistribution.medium} medium, and ${difficultyDistribution.hard} hard questions.
7. For any question that is multiple choice (e.g., type "Multiple Choice Questions", "MCQ", or "Multiple Choice"), you MUST include an "options" field containing an array of exactly 4 strings representing the options/choices. For non-MCQ questions, do not include options or set it to null.
8. For EVERY single question, you MUST generate the correct solution or detailed answer and provide it in the "answer" field. For MCQs, state the correct option clearly and explain briefly. For numerical or short/long questions, provide the step-by-step correct solution.
9. If the SOURCE MATERIAL is missing, empty, or unreadable, do NOT write any warning, message, or conversational text. Simply generate the questions based on your general knowledge of the SUBJECT: ${subject}.
10. Under no circumstances should you include any preamble, introduction, explanation, or postamble. The output must start exactly with the opening brace '{' and end exactly with the closing brace '}' of a valid JSON object. Do not wrap the JSON in markdown code blocks.

JSON Output Schema:
{
  "metadata": {
    "subject": "${subject}",
    "totalMarks": ${totalMarks},
    "duration": ${duration},
    "generatedAt": "${new Date().toISOString()}",
    "instructions": "${instructions || "Attempt all questions."}"
  },
  "sections": [
    {
      "title": "Section Title (e.g. Section A: Multiple Choice Questions)",
      "instruction": "Section specific instructions",
      "questions": [
        {
          "questionNumber": 1,
          "text": "The text of the question?",
          "difficulty": "easy", // must be "easy", "medium", or "hard"
          "marks": 5,
          "bloomLevel": "Remember",
          "type": "MCQ", // must be one of: ${questionTypes.join(", ")}
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"], // MUST include array of exactly 4 choices ONLY if MCQ
          "answer": "Correct Option: Option A. Explanation: ..." // Detailed answer/solution for the question. MUST be provided for EVERY question.
        }
      ]
    }
  ]
}

Strict Rule: Return ONLY the raw JSON object. Do NOT wrap it in markdown codeblocks (e.g. \`\`\`json). Do NOT add any preamble, conversational text, or postamble.
`;
};
