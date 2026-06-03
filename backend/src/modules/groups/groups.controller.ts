import { Response } from "express";
import mongoose from "mongoose";
import { parse } from "csv-parse";
import Group from "../../models/Group";
import Student from "../../models/Student";
import catchErrors from "../../utils/catchErrors";
import appAssert from "../../utils/appAssert";
import { AppError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";
import { OK, CREATED, NOT_FOUND, BAD_REQUEST } from "../../constants/http";

// Helper: Assert valid ObjectId
const assertValidId = (id: string, name = "ID") => {
  appAssert(mongoose.Types.ObjectId.isValid(id), BAD_REQUEST, `Invalid ${name} format`);
};

// Create Group
export const createGroupHandler = catchErrors(async (req: any, res: Response) => {
  const { name, subject, grade, academicYear, subjectColumns } = req.body;

  const group = await Group.create({
    teacherId: req.userId,
    name,
    subject,
    grade,
    academicYear,
    subjectColumns: subjectColumns || [],
  });

  return sendSuccess(res, { group }, CREATED);
});

// List Groups
export const listGroupsHandler = catchErrors(async (req: any, res: Response) => {
  // Use aggregation to fetch groups and count students in one go
  const groups = await Group.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(req.userId) } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "students",
        localField: "_id",
        foreignField: "groupId",
        as: "studentDocs",
      },
    },
    {
      $project: {
        _id: 1,
        teacherId: 1,
        name: 1,
        subject: 1,
        grade: 1,
        academicYear: 1,
        subjectColumns: 1,
        createdAt: 1,
        updatedAt: 1,
        studentCount: { $size: "$studentDocs" },
      },
    },
  ]);

  return sendSuccess(res, { groups });
});

// Get Group
export const getGroupHandler = catchErrors(async (req: any, res: Response) => {
  const { id } = req.params;
  assertValidId(id, "group ID");

  const group = await Group.findOne({ _id: id, teacherId: req.userId });
  appAssert(group, NOT_FOUND, "Group not found or unauthorized");

  return sendSuccess(res, { group });
});

// Update Group
export const updateGroupHandler = catchErrors(async (req: any, res: Response) => {
  const { id } = req.params;
  assertValidId(id, "group ID");

  const group = await Group.findOne({ _id: id, teacherId: req.userId });
  appAssert(group, NOT_FOUND, "Group not found or unauthorized");

  const { name, subject, grade, academicYear, subjectColumns } = req.body;

  if (name !== undefined) group.name = name;
  if (subject !== undefined) group.subject = subject;
  if (grade !== undefined) group.grade = grade;
  if (academicYear !== undefined) group.academicYear = academicYear;
  if (subjectColumns !== undefined) group.subjectColumns = subjectColumns;

  await group.save();

  return sendSuccess(res, { group });
});

// Delete Group
export const deleteGroupHandler = catchErrors(async (req: any, res: Response) => {
  const { id } = req.params;
  assertValidId(id, "group ID");

  const group = await Group.findOne({ _id: id, teacherId: req.userId });
  appAssert(group, NOT_FOUND, "Group not found or unauthorized");

  // Cascade delete students
  await Student.deleteMany({ groupId: group._id });
  await group.deleteOne();

  return sendSuccess(res, { message: "Group and its students deleted successfully" });
});

// Add Student
export const addStudentHandler = catchErrors(async (req: any, res: Response) => {
  const { id } = req.params; // Group ID
  assertValidId(id, "group ID");

  const group = await Group.findOne({ _id: id, teacherId: req.userId });
  appAssert(group, NOT_FOUND, "Group not found or unauthorized");

  const { name, rollNumber, email, phone } = req.body;

  // Roll Number uniqueness check
  const existing = await Student.findOne({ groupId: id, rollNumber });
  appAssert(!existing, BAD_REQUEST, `Roll number "${rollNumber}" already exists in this group`);

  const student = await Student.create({
    groupId: id,
    teacherId: req.userId,
    name,
    rollNumber,
    email: email || "",
    phone: phone || "",
    academicHistory: [],
    overallRemark: "",
    attendancePercent: null,
  });

  return sendSuccess(res, { student }, CREATED);
});

// Bulk Import CSV
const normalizeHeaders = (headers: string[]): string[] => {
  return headers.map((h) => {
    const normalized = h.toLowerCase().trim();
    if (
      normalized === "roll number" ||
      normalized === "roll number*" ||
      normalized === "rollno" ||
      normalized === "roll_number" ||
      normalized === "roll #" ||
      normalized === "roll"
    ) {
      return "rollNumber";
    }
    if (
      normalized === "name" ||
      normalized === "student name" ||
      normalized === "studentname" ||
      normalized === "full name" ||
      normalized === "fullname"
    ) {
      return "name";
    }
    if (normalized === "email" || normalized === "email address" || normalized === "email_address") {
      return "email";
    }
    if (normalized === "phone" || normalized === "phone number" || normalized === "phone_number" || normalized === "contact") {
      return "phone";
    }
    return normalized;
  });
};

const parseCsv = (buffer: Buffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    parse(
      buffer,
      {
        columns: normalizeHeaders,
        skip_empty_lines: true,
        trim: true,
      },
      (err, records) => {
        if (err) reject(err);
        else resolve(records);
      }
    );
  });
};

export const bulkImportStudentsHandler = catchErrors(async (req: any, res: Response) => {
  const { id } = req.params; // Group ID
  assertValidId(id, "group ID");

  const group = await Group.findOne({ _id: id, teacherId: req.userId });
  appAssert(group, NOT_FOUND, "Group not found or unauthorized");

  appAssert(req.file, BAD_REQUEST, "CSV file is required");

  let records: any[] = [];
  try {
    records = await parseCsv(req.file.buffer);
  } catch (err: any) {
    throw new AppError(BAD_REQUEST, `Invalid CSV format: ${err.message}`);
  }

  // Pre-load existing students for roll number checking
  const existingStudents = await Student.find({ groupId: id });
  const existingRolls = new Set(existingStudents.map((s) => s.rollNumber.toLowerCase().trim()));

  const skipped: string[] = [];
  const errors: { row: number; error: string }[] = [];
  const validStudents: any[] = [];
  const seenInBatch = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1;

    const name = (row.name || "").trim();
    const rollNumber = (row.rollNumber || "").trim();
    const email = (row.email || "").trim();
    const phone = (row.phone || "").trim();

    // 1. Missing Name or Roll Number
    if (!name || !rollNumber) {
      errors.push({
        row: rowNum,
        error: "Missing required fields: Name and Roll Number are required.",
      });
      continue;
    }

    const normRoll = rollNumber.toLowerCase();

    // 2. Duplicate within the CSV itself
    if (seenInBatch.has(normRoll)) {
      skipped.push(rollNumber);
      continue;
    }

    // 3. Duplicate against existing database students
    if (existingRolls.has(normRoll)) {
      skipped.push(rollNumber);
      continue;
    }

    seenInBatch.add(normRoll);

    validStudents.push({
      groupId: group._id,
      teacherId: req.userId,
      name,
      rollNumber,
      email,
      phone,
      academicHistory: [],
      overallRemark: "",
      attendancePercent: null,
    });
  }

  if (validStudents.length > 0) {
    await Student.insertMany(validStudents);
  }

  return sendSuccess(res, {
    imported: validStudents.length,
    skipped,
    errors,
  });
});

// List Students
export const listStudentsHandler = catchErrors(async (req: any, res: Response) => {
  const { id } = req.params; // Group ID
  assertValidId(id, "group ID");

  const group = await Group.findOne({ _id: id, teacherId: req.userId });
  appAssert(group, NOT_FOUND, "Group not found or unauthorized");

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const search = (req.query.search as string || "").trim();

  const query: any = { groupId: id, teacherId: req.userId };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { rollNumber: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const students = await Student.find(query)
    .sort({ rollNumber: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Student.countDocuments(query);

  return sendSuccess(res, {
    students,
    total,
    page,
    limit,
  });
});

// Get Student
export const getStudentHandler = catchErrors(async (req: any, res: Response) => {
  const { id, sid } = req.params; // Group ID & Student ID
  assertValidId(id, "group ID");
  assertValidId(sid, "student ID");

  const student = await Student.findOne({ _id: sid, groupId: id, teacherId: req.userId });
  appAssert(student, NOT_FOUND, "Student not found or unauthorized");

  return sendSuccess(res, { student });
});

// Update Student
export const updateStudentHandler = catchErrors(async (req: any, res: Response) => {
  const { id, sid } = req.params; // Group ID & Student ID
  assertValidId(id, "group ID");
  assertValidId(sid, "student ID");

  const student = await Student.findOne({ _id: sid, groupId: id, teacherId: req.userId });
  appAssert(student, NOT_FOUND, "Student not found or unauthorized");

  const { name, rollNumber, email, phone, overallRemark, attendancePercent, academicHistory } = req.body;

  if (rollNumber !== undefined && rollNumber !== student.rollNumber) {
    // Unique check
    const existing = await Student.findOne({ groupId: id, rollNumber });
    appAssert(!existing, BAD_REQUEST, `Roll number "${rollNumber}" already exists in this group`);
    student.rollNumber = rollNumber;
  }

  if (name !== undefined) student.name = name;
  if (email !== undefined) student.email = email;
  if (phone !== undefined) student.phone = phone;
  if (overallRemark !== undefined) student.overallRemark = overallRemark;
  if (attendancePercent !== undefined) student.attendancePercent = attendancePercent;
  if (academicHistory !== undefined) student.academicHistory = academicHistory;

  await student.save();

  return sendSuccess(res, { student });
});

// Delete Student
export const deleteStudentHandler = catchErrors(async (req: any, res: Response) => {
  const { id, sid } = req.params; // Group ID & Student ID
  assertValidId(id, "group ID");
  assertValidId(sid, "student ID");

  const student = await Student.findOne({ _id: sid, groupId: id, teacherId: req.userId });
  appAssert(student, NOT_FOUND, "Student not found or unauthorized");

  await student.deleteOne();

  return sendSuccess(res, { message: "Student deleted successfully" });
});

// Helper for CSV escaping
const escapeCsv = (val: any): string => {
  if (val === undefined || val === null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Export Students CSV
export const exportStudentsHandler = catchErrors(async (req: any, res: Response) => {
  const { id } = req.params; // Group ID
  assertValidId(id, "group ID");

  const group = await Group.findOne({ _id: id, teacherId: req.userId });
  appAssert(group, NOT_FOUND, "Group not found or unauthorized");

  const students = await Student.find({ groupId: id, teacherId: req.userId }).sort({ rollNumber: 1 });

  const cols = group.subjectColumns || [];
  const headers = ["Roll Number", "Name", "Email", "Phone", "Attendance %", "Overall Remark", ...cols];

  const csvRows = [headers.map(escapeCsv).join(",")];

  for (const student of students) {
    const row = [
      student.rollNumber,
      student.name,
      student.email || "",
      student.phone || "",
      student.attendancePercent !== null ? `${student.attendancePercent}%` : "",
      student.overallRemark || "",
    ];

    for (const col of cols) {
      const entry = student.academicHistory.find(
        (h) => h.columnName.toLowerCase().trim() === col.toLowerCase().trim()
      );
      if (entry) {
        row.push(`${entry.marks}/${entry.totalMarks}`);
      } else {
        row.push("");
      }
    }
    csvRows.push(row.map(escapeCsv).join(","));
  }

  const csvString = csvRows.join("\r\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(group.name)}-students.csv"`
  );

  return res.status(OK).send(csvString);
});
