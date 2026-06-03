import { z } from "zod";

export const CreateGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  subject: z.string().min(1, "Subject is required"),
  grade: z.string().min(1, "Grade is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  subjectColumns: z.array(z.string()).optional().default([]),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters").optional(),
  subject: z.string().min(1, "Subject is required").optional(),
  grade: z.string().min(1, "Grade is required").optional(),
  academicYear: z.string().min(1, "Academic year is required").optional(),
  subjectColumns: z.array(z.string()).optional(),
});

export const AddStudentSchema = z.object({
  name: z.string().min(2, "Student name must be at least 2 characters"),
  rollNumber: z.string().min(1, "Roll number is required"),
  email: z.string().email("Invalid email format").or(z.literal("")).optional(),
  phone: z.string().optional(),
});

export const UpdateStudentSchema = z.object({
  name: z.string().min(2, "Student name must be at least 2 characters").optional(),
  rollNumber: z.string().min(1, "Roll number is required").optional(),
  email: z.string().email("Invalid email format").or(z.literal("")).optional(),
  phone: z.string().optional(),
  overallRemark: z.string().optional(),
  attendancePercent: z.number().min(0).max(100).nullable().optional(),
  academicHistory: z
    .array(
      z.object({
        columnName: z.string().min(1, "Column name is required"),
        marks: z.number().min(0, "Marks must be 0 or greater"),
        totalMarks: z.number().min(1, "Total marks must be 1 or greater"),
        remarks: z.string().optional(),
      })
    )
    .optional(),
});

export const AddColumnSchema = z.object({
  columnName: z.string().min(1, "Column name is required"),
});
