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
          "type": "MCQ" // must be one of: ${questionTypes.join(", ")}
        }
      ]
    }
  ]
}

Strict Rule: Return ONLY the raw JSON object. Do NOT wrap it in markdown codeblocks (e.g. \`\`\`json). Do NOT add any preamble, conversational text, or postamble.
`;
};
