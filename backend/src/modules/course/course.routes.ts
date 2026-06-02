import { Router } from "express";
import {
  createCourseHandler,
  listCoursesHandler,
  updateCourseHandler,
  deleteCourseHandler,
  listCoursePresentationsHandler,
  listCourseQuestionBanksHandler,
} from "./course.controller";

const courseRoutes = Router();

// prefix: /api/courses
courseRoutes.post("/", createCourseHandler);
courseRoutes.get("/", listCoursesHandler);
courseRoutes.get("/:courseId/presentations", listCoursePresentationsHandler);
courseRoutes.get("/:courseId/question-banks", listCourseQuestionBanksHandler);
courseRoutes.patch("/:courseId", updateCourseHandler);
courseRoutes.delete("/:courseId", deleteCourseHandler);


export default courseRoutes;
