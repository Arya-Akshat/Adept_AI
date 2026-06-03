import { Router } from "express";
import multer from "multer";
import authenticate from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createGroupHandler,
  listGroupsHandler,
  getGroupHandler,
  updateGroupHandler,
  deleteGroupHandler,
  addStudentHandler,
  bulkImportStudentsHandler,
  listStudentsHandler,
  getStudentHandler,
  updateStudentHandler,
  deleteStudentHandler,
  exportStudentsHandler,
} from "./groups.controller";
import {
  CreateGroupSchema,
  UpdateGroupSchema,
  AddStudentSchema,
  UpdateStudentSchema,
} from "./groups.schema";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Protect all group/student routes with authenticate middleware
router.use(authenticate);

// Groups CRUD
router.post("/", validate(CreateGroupSchema), createGroupHandler);
router.get("/", listGroupsHandler);
router.get("/:id", getGroupHandler);
router.patch("/:id", validate(UpdateGroupSchema), updateGroupHandler);
router.delete("/:id", deleteGroupHandler);

// Students roster within a Group
router.post("/:id/students", validate(AddStudentSchema), addStudentHandler);
router.post("/:id/students/csv", upload.single("file"), bulkImportStudentsHandler);
router.get("/:id/students", listStudentsHandler);

// Ordering: Register /students/export BEFORE /students/:sid to prevent route parameter clash
router.get("/:id/students/export", exportStudentsHandler);
router.get("/:id/students/:sid", getStudentHandler);
router.patch("/:id/students/:sid", validate(UpdateStudentSchema), updateStudentHandler);
router.delete("/:id/students/:sid", deleteStudentHandler);

export default router;
