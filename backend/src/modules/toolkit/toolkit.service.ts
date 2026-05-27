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
