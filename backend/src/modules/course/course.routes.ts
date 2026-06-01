import { Router } from "express";
import {
  createCourseHandler,
  listCoursesHandler,
  updateCourseHandler,
  deleteCourseHandler,
} from "./course.controller";

const courseRoutes = Router();

// prefix: /api/courses
courseRoutes.post("/", createCourseHandler);
courseRoutes.get("/", listCoursesHandler);
courseRoutes.patch("/:courseId", updateCourseHandler);
courseRoutes.delete("/:courseId", deleteCourseHandler);

export default courseRoutes;
