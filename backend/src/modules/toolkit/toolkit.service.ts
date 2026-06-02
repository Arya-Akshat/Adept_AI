import { generateCustomJson } from "../../services/groq.service";
import RubricModel from "../../models/Rubric";
import type { LessonPlanRequest, RubricRequest } from "./toolkit.types";
import { AppError } from "../../utils/errors";
import { INTERNAL_SERVER_ERROR } from "../../constants/http";
import logger from "../../utils/logger";

export const generateLessonPlan = async (payload: LessonPlanRequest) => {
  const systemPrompt = "You are an expert curriculum designer. You must generate a highly structured lesson plan strictly in the requested JSON format. Do not write any markdown code fences, do not write any introductory or concluding text, write only the raw JSON string. The output must strictly match this JSON schema:\n" +
    JSON.stringify({
      metadata: {
        topic: "string",
        subject: "string",
        gradeLevel: "string",
        duration: "number",
        generatedAt: "string"
      },
      objectives: ["string"],
      sections: [
        {
          title: "string",
          duration: "number",
          description: "string",
          teacherActions: ["string"],
          studentActions: ["string"],
          materials: ["string"]
        }
      ],
      assessment: "string",
      homework: "string",
      teacherNotes: "string"
    }, null, 2);

  const userPrompt = `Generate a detailed lesson plan with the following details:
Topic: ${payload.topic}
Subject: ${payload.subject}
Grade Level: ${payload.gradeLevel}
Duration: ${payload.duration} minutes
Learning Objectives: ${payload.objectives || "Define suitable objectives based on the topic"}
Teaching Style: ${payload.teachingStyle}

Requirements:
- The sections' durations must sum to exactly ${payload.duration} minutes.
- Provide clear, actionable teacher and student steps.`;

  const rawJson = await generateCustomJson(systemPrompt, userPrompt, 2500);
  try {
    const cleaned = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);
    
    // Add generatedAt if missing
    if (!data.metadata) data.metadata = {};
    data.metadata.generatedAt = new Date().toISOString();
    data.metadata.topic = payload.topic;
    data.metadata.subject = payload.subject;
    data.metadata.gradeLevel = payload.gradeLevel;
    data.metadata.duration = payload.duration;

    return data;
  } catch (err: any) {
    logger.error({ error: err.message, rawJson }, "Lesson Plan parsing failed");
    throw new AppError(INTERNAL_SERVER_ERROR, "Failed to parse AI generated lesson plan");
  }
};

export const generateRubric = async (teacherId: string, payload: RubricRequest) => {
  const systemPrompt = "You are an expert assessment specialist. You must generate a complete grading rubric strictly in the requested JSON format. Do not write any markdown code fences, do not write any introductory or concluding text, write only the raw JSON string. The output must strictly match this JSON schema:\n" +
    JSON.stringify({
      metadata: {
        assignmentTitle: "string",
        assignmentType: "string",
        gradeLevel: "string",
        totalMarks: "number",
        generatedAt: "string"
      },
      criteria: [
        {
          name: "string",
          weight: "number (percentage, weights sum to 100)",
          marks: "number (totalMarks * weight / 100)",
          levels: [
            {
              label: "string (e.g. Excellent, Good, Developing, Beginning)",
              score: "number",
              descriptor: "string"
            }
          ]
        }
      ]
    }, null, 2);

  const userPrompt = `Generate a detailed rubric for:
Assignment Title: ${payload.assignmentTitle}
Assignment Type: ${payload.assignmentType}
Grade Level: ${payload.gradeLevel}
Total Marks: ${payload.totalMarks}
Number of Performance Levels: ${payload.performanceLevels}
Performance Criteria (optional): ${payload.criteria || "Auto-determine criteria suitable for this assignment type"}

Requirements:
- Generate exactly ${payload.performanceLevels} levels per criteria, from highest performance to lowest.
- The criteria weights must sum to exactly 100.
- All criteria marks must sum to exactly ${payload.totalMarks}.`;

  const rawJson = await generateCustomJson(systemPrompt, userPrompt, 3000);
  try {
    const cleaned = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);

    // Save metadata
    data.metadata = {
      assignmentTitle: payload.assignmentTitle,
      assignmentType: payload.assignmentType,
      gradeLevel: payload.gradeLevel,
      totalMarks: payload.totalMarks,
      generatedAt: new Date(),
    };

    // Calculate marks and validate totals to prevent AI drift
    let totalWeight = 0;
    let totalMarksCalculated = 0;
    
    if (Array.isArray(data.criteria)) {
      data.criteria.forEach((crit: any) => {
        totalWeight += crit.weight || 0;
        crit.marks = parseFloat(((payload.totalMarks * (crit.weight || 0)) / 100).toFixed(1));
        totalMarksCalculated += crit.marks;
      });

      // Adjust rounding errors if any
      if (data.criteria.length > 0 && Math.abs(totalMarksCalculated - payload.totalMarks) > 0.01) {
        const diff = payload.totalMarks - totalMarksCalculated;
        data.criteria[data.criteria.length - 1].marks = parseFloat(
          (data.criteria[data.criteria.length - 1].marks + diff).toFixed(1)
        );
      }
    }

    // Save to DB
    const rubric = new RubricModel({
      teacherId,
      metadata: data.metadata,
      criteria: data.criteria,
    });
    await rubric.save();

    // Return saved document
    return rubric;
  } catch (err: any) {
    logger.error({ error: err.message, rawJson }, "Rubric parsing failed");
    throw new AppError(INTERNAL_SERVER_ERROR, "Failed to parse AI generated rubric");
  }
};

import LibraryFile from "../../models/LibraryFile";
import Presentation from "../../models/Presentation";
import appAssert from "../../utils/appAssert";
import type { PresentationRequest } from "./toolkit.types";

export const generatePresentation = async (
  teacherId: string,
  payload: PresentationRequest
) => {
  const { courseId, fileIds, slideCount = 8, topicFocus } = payload;
  appAssert(fileIds && fileIds.length > 0, 400, "Please select at least one study material");

  // Fetch the selected files from DB
  const files = await LibraryFile.find({
    _id: { $in: fileIds },
    userId: teacherId,
  });

  appAssert(files.length > 0, 404, "No study materials found");

  // Compile context from their roadmaps
  let combinedContext = "";
  files.forEach((file) => {
    combinedContext += `Source Material: ${file.originalName}\n`;
    if (file.roadmapData) {
      // Traverse unit/topic structure of the roadmap
      Object.entries(file.roadmapData).forEach(([unitIdx, unitObj]: [string, any]) => {
        combinedContext += `Unit ${parseInt(unitIdx, 10) + 1}:\n`;
        if (unitObj && typeof unitObj === "object") {
          Object.entries(unitObj).forEach(([topicIdx, topicObj]: [string, any]) => {
            if (topicObj && typeof topicObj === "object") {
              combinedContext += `- Topic: ${topicObj.title || ""}\n  Summary: ${topicObj.summary || ""}\n`;
            }
          });
        }
      });
    }
    combinedContext += "\n";
  });

  const systemPrompt =
    "You are an expert educator and visual designer. You must generate a complete slide presentation outline strictly in the requested JSON format based on the provided course material. Do not write any markdown code fences, do not write any introductory or concluding text, write only the raw JSON string. The output must strictly match this JSON schema:\n" +
    JSON.stringify(
      {
        metadata: {
          title: "string",
          subject: "string",
          slideCount: "number",
          generatedAt: "string",
        },
        slides: [
          {
            slideNumber: "number",
            title: "string",
            bulletPoints: ["string (5-7 items per slide, each a full informative sentence of 15-25 words explaining the concept clearly — not just a label or keyword)"],
            teacherNotes: "string (detailed explanatory script or teaching details for the teacher, 3-5 sentences)",
            suggestedImagePrompt: "string (highly descriptive image prompt for creating visual slides or icons)",
          },
        ],
      },
      null,
      2
    );

  const userPrompt = `Generate a PowerPoint slide presentation with exactly ${slideCount} slides using the following course materials:
  
  ---
  ${combinedContext}
  ---
  
  Focus / Topic Scope: ${topicFocus || "A comprehensive overview of the materials."}
  
  Requirements:
  - Generate exactly ${slideCount} slides.
  - Slide 1 should be a Title slide with overview bullet points of what the presentation covers.
  - Slide ${slideCount} should be a Summary / Conclusion slide with key takeaways.
  - Each slide must have 5-7 bullet points. Every bullet point must be a complete, informative sentence (15-25 words) that explains the concept — NOT a single word or short phrase. Include facts, definitions, examples, or mechanisms.
  - teacherNotes must contain a detailed teaching script for that slide (3-5 sentences).
  - suggestedImagePrompt must be a detailed, visual prompt describing a clean, educational graphic or diagram related to that slide.`;

  const rawJson = await generateCustomJson(systemPrompt, userPrompt, 6000);
  try {
    const cleaned = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);

    // Populate metadata
    if (!data.metadata) data.metadata = {};
    data.metadata.slideCount = slideCount;
    data.metadata.generatedAt = new Date().toISOString();

    // Save to DB
    const presentation = new Presentation({
      teacherId,
      courseId,
      metadata: {
        title: data.metadata.title || `Presentation - ${topicFocus || "Overview"}`,
        subject: data.metadata.subject || "General Subject",
        slideCount: data.metadata.slideCount,
        generatedAt: new Date(data.metadata.generatedAt),
      },
      slides: data.slides,
    });
    await presentation.save();

    return presentation;
  } catch (err: any) {
    logger.error({ error: err.message, rawJson }, "Presentation parsing failed");
    throw new AppError(500, "Failed to parse AI generated presentation outline");
  }
};

import QuestionBank from "../../models/QuestionBank";
import type { QuestionBankRequest } from "./toolkit.types";

export const generateQuestionBank = async (
  teacherId: string,
  payload: QuestionBankRequest
) => {
  const { courseId, fileIds, questionCount = 10, questionTypes, difficulty, topicFocus } = payload;
  appAssert(fileIds && fileIds.length > 0, 400, "Please select at least one study material");
  appAssert(questionTypes && questionTypes.length > 0, 400, "Please select at least one question type");

  // Fetch the selected files from DB
  const files = await LibraryFile.find({
    _id: { $in: fileIds },
    userId: teacherId,
  });

  appAssert(files.length > 0, 404, "No study materials found");

  // Compile context from their roadmaps
  let combinedContext = "";
  files.forEach((file) => {
    combinedContext += `Source Material: ${file.originalName}\n`;
    if (file.roadmapData) {
      // Traverse unit/topic structure of the roadmap
      Object.entries(file.roadmapData).forEach(([unitIdx, unitObj]: [string, any]) => {
        combinedContext += `Unit ${parseInt(unitIdx, 10) + 1}:\n`;
        if (unitObj && typeof unitObj === "object") {
          Object.entries(unitObj).forEach(([topicIdx, topicObj]: [string, any]) => {
            if (topicObj && typeof topicObj === "object") {
              combinedContext += `- Topic: ${topicObj.title || ""}\n  Summary: ${topicObj.summary || ""}\n`;
            }
          });
        }
      });
    }
    combinedContext += "\n";
  });

  const systemPrompt =
    "You are an expert assessment developer. You must generate a highly structured question bank strictly in the requested JSON format based on the provided course material. Do not write any markdown code fences, do not write any introductory or concluding text, write only the raw JSON string. The output must strictly match this JSON schema:\n" +
    JSON.stringify(
      {
        metadata: {
          title: "string",
          subject: "string",
          questionCount: "number",
          generatedAt: "string",
        },
        questions: [
          {
            questionNumber: "number",
            questionText: "string",
            type: "mcq | short | long",
            cognitiveLevel: "remembering | understanding | applying | analyzing | evaluating | creating",
            options: ["string (only for MCQ questions, 4 options)"],
            correctAnswer: "string (correct option letter for MCQ e.g., 'A', or sample answer/rubric points for short/long questions)",
            marks: "number",
            difficulty: "easy | medium | hard",
          },
        ],
      },
      null,
      2
    );

  const userPrompt = `Generate a question bank with exactly ${questionCount} questions of types [${questionTypes.join(", ")}] and difficulty level "${difficulty}" using the following course materials:
  
  ---
  ${combinedContext}
  ---
  
  Focus / Topic Scope: ${topicFocus || "A comprehensive overview of the materials."}
  
  Requirements:
  - Generate exactly ${questionCount} questions.
  - Distribute questions among types: [${questionTypes.join(", ")}].
  - Assign marks: MCQs = 1 mark, Short Answer = 2-3 marks, Long Answer = 5-10 marks.
  - Assign realistic cognitive levels according to Bloom's Taxonomy.
  - If a question is an MCQ, the options array must contain exactly 4 options.`;

  const rawJson = await generateCustomJson(systemPrompt, userPrompt, 6000);
  try {
    const cleaned = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);

    // Populate metadata
    if (!data.metadata) data.metadata = {};
    data.metadata.questionCount = questionCount;
    data.metadata.generatedAt = new Date().toISOString();

    // Save to DB
    const questionBank = new QuestionBank({
      teacherId,
      courseId,
      metadata: {
        title: data.metadata.title || `Question Bank - ${topicFocus || "Overview"}`,
        subject: data.metadata.subject || "General Subject",
        questionCount: data.metadata.questionCount,
        generatedAt: new Date(data.metadata.generatedAt),
      },
      questions: data.questions,
    });
    await questionBank.save();

    return questionBank;
  } catch (err: any) {
    logger.error({ error: err.message, rawJson }, "Question Bank parsing failed");
    throw new AppError(500, "Failed to parse AI generated question bank");
  }
};

