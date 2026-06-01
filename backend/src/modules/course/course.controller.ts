import { Request, Response } from "express";
import Course from "../../models/Course";
import LibraryFile from "../../models/LibraryFile";
import { OK, CREATED, BAD_REQUEST, NOT_FOUND } from "../../constants/http";
import appAssert from "../../utils/appAssert";
import catchErrors from "../../utils/catchErrors";

// Create Course
export const createCourseHandler = catchErrors(async (req: any, res: Response) => {
  const { name, description, color } = req.body;
  appAssert(name, BAD_REQUEST, "Course name is required");

  const course = await Course.create({
    userId: req.userId,
    name,
    description,
    color: color || "#ea580c",
  });

  return res.status(CREATED).json(course);
});

// List Courses
export const listCoursesHandler = catchErrors(async (req: any, res: Response) => {
  const courses = await Course.find({ userId: req.userId }).sort({ createdAt: -1 });
  return res.status(OK).json(courses);
});

// Update Course
export const updateCourseHandler = catchErrors(async (req: any, res: Response) => {
  const { courseId } = req.params;
  const { name, description, color } = req.body;

  const course = await Course.findOne({ _id: courseId, userId: req.userId });
  appAssert(course, NOT_FOUND, "Course not found");

  if (name) course.name = name;
  if (description !== undefined) course.description = description;
  if (color) course.color = color;

  await course.save();
  return res.status(OK).json(course);
});

// Delete Course
export const deleteCourseHandler = catchErrors(async (req: any, res: Response) => {
  const { courseId } = req.params;

  const course = await Course.findOne({ _id: courseId, userId: req.userId });
  appAssert(course, NOT_FOUND, "Course not found");

  // Remove this course reference from any files that were in it
  await LibraryFile.updateMany(
    { userId: req.userId, courseId: course._id },
    { $unset: { courseId: "" } }
  );

  await course.deleteOne();
  return res.status(OK).json({ message: "Course deleted successfully" });
});

// Assign File to Course (PATCH /api/pdfs/:pdfId/assign-course)
export const assignFileToCourseHandler = catchErrors(async (req: any, res: Response) => {
  const { pdfId } = req.params;
  const { courseId } = req.body; // Can be null to unassign

  const file = await LibraryFile.findOne({ _id: pdfId, userId: req.userId });
  appAssert(file, NOT_FOUND, "Study material file not found");

  if (courseId) {
    // Verify course exists and belongs to this user
    const course = await Course.findOne({ _id: courseId, userId: req.userId });
    appAssert(course, NOT_FOUND, "Target course not found");
    file.courseId = course._id as any;
  } else {
    file.courseId = undefined;
  }

  await file.save();
  return res.status(OK).json({
    message: "File assigned to course successfully",
    fileId: file._id,
    courseId: file.courseId || null,
  });
});
