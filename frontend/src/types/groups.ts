export interface AcademicEntry {
  columnName: string;
  marks: number;
  totalMarks: number;
  remarks: string;
}

export interface Student {
  _id: string;
  groupId: string;
  name: string;
  rollNumber: string;
  email: string;
  phone: string;
  academicHistory: AcademicEntry[];
  overallRemark: string;
  attendancePercent: number | null;
  createdAt: string;
}

export interface Group {
  _id: string;
  name: string;
  subject: string;
  grade: string;
  academicYear: string;
  subjectColumns: string[];
  studentCount?: number;
  createdAt: string;
}
