import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, AlertTriangle, Check, X, Loader2, Save } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useGroupsStore } from "@/store/groupsStore";
import { groupsApi } from "@/lib/api";
import { computeGrade, gradeColor } from "@/lib/gradeUtils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const StudentProfilePage: React.FC = () => {
  const { id: groupId, sid: studentId } = useParams<{ id: string; sid: string }>() as { id: string; sid: string };
  const navigate = useNavigate();

  const {
    currentGroup,
    setCurrentGroup,
    currentStudent,
    setCurrentStudent,
    updateStudent,
    deleteStudent
  } = useGroupsStore();

  const [loadingStudent, setLoadingStudent] = useState(true);

  // Auto-save fields
  const [localRemarks, setLocalRemarks] = useState("");
  const [remarksStatus, setRemarksStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [localAttendance, setLocalAttendance] = useState<string>("");
  const [attendanceStatus, setAttendanceStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Inline grades editor states
  const [editingColName, setEditingColName] = useState<string | null>(null);
  const [inputMarks, setInputMarks] = useState<number | "">("");
  const [inputTotal, setInputTotal] = useState<number | "">("");
  const [inputRemarks, setInputRemarks] = useState("");

  // Edit details modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRoll, setEditRoll] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Delete student confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch group & student details on mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingStudent(true);
      try {
        const groupRes = await groupsApi.getGroup(groupId);
        setCurrentGroup(groupRes.data.data.group);

        const studentRes = await groupsApi.getStudent(groupId, studentId);
        const student = studentRes.data.data.student;
        setCurrentStudent(student);

        // Pre-fill local fields
        setLocalRemarks(student.overallRemark || "");
        setLocalAttendance(student.attendancePercent !== null ? String(student.attendancePercent) : "");
      } catch (err: any) {
        toast.error("Failed to load student details");
        navigate(`/groups/${groupId}`);
      } finally {
        setLoadingStudent(false);
      }
    };

    loadData();

    return () => {
      setCurrentStudent(null);
    };
  }, [groupId, studentId, setCurrentGroup, setCurrentStudent, navigate]);

  // Debounced auto-save for Remarks
  useEffect(() => {
    if (!currentStudent || localRemarks === currentStudent.overallRemark) return;

    const timer = setTimeout(async () => {
      setRemarksStatus("saving");
      try {
        await updateStudent(groupId, studentId, { overallRemark: localRemarks });
        setRemarksStatus("saved");
        setTimeout(() => setRemarksStatus("idle"), 2000);
      } catch {
        setRemarksStatus("idle");
        toast.error("Failed to auto-save remarks");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [localRemarks, currentStudent, groupId, studentId, updateStudent]);

  // Debounced auto-save for Attendance
  useEffect(() => {
    if (!currentStudent) return;
    const numVal = localAttendance.trim() === "" ? null : Number(localAttendance);

    if (numVal === currentStudent.attendancePercent) return;
    if (numVal !== null && (isNaN(numVal) || numVal < 0 || numVal > 100)) return;

    const timer = setTimeout(async () => {
      setAttendanceStatus("saving");
      try {
        await updateStudent(groupId, studentId, { attendancePercent: numVal });
        setAttendanceStatus("saved");
        setTimeout(() => setAttendanceStatus("idle"), 2000);
      } catch {
        setAttendanceStatus("idle");
        toast.error("Failed to auto-save attendance");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [localAttendance, currentStudent, groupId, studentId, updateStudent]);

  const handleEditDetailsClick = () => {
    if (!currentStudent) return;
    setEditName(currentStudent.name);
    setEditRoll(currentStudent.rollNumber);
    setEditEmail(currentStudent.email);
    setEditPhone(currentStudent.phone);
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editRoll.trim() || isSavingDetails) return;

    setIsSavingDetails(true);
    setEditError(null);

    try {
      await updateStudent(groupId, studentId, {
        name: editName.trim(),
        rollNumber: editRoll.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
      });
      toast.success("Details updated successfully");
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || "Failed to update details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDeleteStudent = async () => {
    setIsDeleting(true);
    try {
      await deleteStudent(groupId, studentId);
      toast.success("Student removed successfully");
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error("Failed to remove student");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEditGradeClick = (colName: string) => {
    setEditingColName(colName);
    const existing = currentStudent?.academicHistory.find(
      (h) => h.columnName.toLowerCase().trim() === colName.toLowerCase().trim()
    );
    if (existing) {
      setInputMarks(existing.marks);
      setInputTotal(existing.totalMarks);
      setInputRemarks(existing.remarks || "");
    } else {
      setInputMarks("");
      setInputTotal(100);
      setInputRemarks("");
    }
  };

  const handleSaveGrade = async (colName: string) => {
    if (!currentStudent) return;
    if (inputMarks === "" || inputTotal === "" || inputTotal <= 0 || inputMarks < 0) {
      toast.error("Please enter valid marks and out-of values");
      return;
    }

    const newEntry = {
      columnName: colName,
      marks: Number(inputMarks),
      totalMarks: Number(inputTotal),
      remarks: inputRemarks.trim(),
    };

    // Filter out existing and merge
    const updatedHistory = currentStudent.academicHistory.filter(
      (h) => h.columnName.toLowerCase().trim() !== colName.toLowerCase().trim()
    );
    updatedHistory.push(newEntry);

    try {
      await updateStudent(groupId, studentId, { academicHistory: updatedHistory });
      setEditingColName(null);
      toast.success("Grade updated successfully");
    } catch {
      toast.error("Failed to save grade");
    }
  };

  // Avatar hash color generator
  const getAvatarColor = (name: string): string => {
    const colors = [
      "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-900/30",
      "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/30",
      "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-900/30",
      "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-900/30",
      "bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/30",
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/30",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.trim().substring(0, 2).toUpperCase() || "ST";
  };

  const getAttendanceClass = (pct: number | null) => {
    if (pct === null) return "text-gray-400 dark:text-zinc-500";
    if (pct >= 80) return "text-green-600 dark:text-green-400 font-semibold";
    if (pct >= 60) return "text-yellow-600 dark:text-yellow-500 font-semibold";
    return "text-red-650 dark:text-red-450 font-semibold";
  };

  return (
    <Layout>
      {/* Back Button */}
      <div className="mb-4 font-sans">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-zinc-305 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {currentGroup?.name || "Group"}</span>
        </button>
      </div>

      {loadingStudent || !currentStudent ? (
        /* Loader state */
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#EA580C]" />
        </div>
      ) : (
        <div className="font-sans pb-24 max-w-4xl">
          {/* Header Card Section */}
          <div className="relative rounded-3xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left w-full">
              {/* Initials Avatar */}
              <div
                className={`flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full text-xl md:text-2xl font-bold border ${getAvatarColor(
                  currentStudent.name
                )}`}
              >
                {getInitials(currentStudent.name)}
              </div>

              {/* Student Metadata */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-50 leading-snug">
                  {currentStudent.name}
                </h2>
                <div className="mt-2.5 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs font-medium text-gray-500 dark:text-zinc-400">
                  <span>
                    Roll No: <strong className="text-gray-800 dark:text-zinc-200">{currentStudent.rollNumber}</strong>
                  </span>
                  <span className="hidden md:inline text-gray-300 dark:text-zinc-800">•</span>
                  <span className="truncate">
                    Email: <strong className="text-gray-800 dark:text-zinc-200">{currentStudent.email || "—"}</strong>
                  </span>
                  <span className="hidden md:inline text-gray-300 dark:text-zinc-800">•</span>
                  <span>
                    Phone: <strong className="text-gray-800 dark:text-zinc-200">{currentStudent.phone || "—"}</strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleEditDetailsClick}
              className="flex items-center justify-center gap-1.5 rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4.5 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors md:absolute md:top-8 md:right-8"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Academic History (Left Side) */}
            <div className="md:col-span-2 flex flex-col gap-6">
              <div className="rounded-3xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 mb-4">Academic History</h3>

                {!currentGroup || currentGroup.subjectColumns.length === 0 ? (
                  /* Empty academic history message */
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-400 dark:text-zinc-500 leading-normal">
                      No grade columns defined for this group. Add columns in the group settings to track grades.
                    </p>
                    <button
                      onClick={() => navigate(`/groups/${groupId}?tab=columns`)}
                      className="mt-3 text-xs font-semibold text-[#EA580C] hover:underline"
                    >
                      Go to Grade Columns →
                    </button>
                  </div>
                ) : (
                  /* History list */
                  <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-zinc-900">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 dark:border-zinc-850 bg-gray-50 dark:bg-zinc-900/50 font-semibold text-gray-500 dark:text-zinc-400">
                          <th className="p-3">Column Name</th>
                          <th className="p-3 w-20">Score</th>
                          <th className="p-3 w-16">Grade</th>
                          <th className="p-3">Remarks</th>
                          <th className="p-3 w-20 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentGroup.subjectColumns.map((col, index) => {
                          const isEditing = editingColName === col;
                          const entry = currentStudent.academicHistory.find(
                            (h) => h.columnName.toLowerCase().trim() === col.toLowerCase().trim()
                          );

                          if (isEditing) {
                            return (
                              <tr key={index} className="border-b border-gray-100 dark:border-zinc-900 bg-orange-50/10 dark:bg-orange-950/5">
                                <td className="p-3 font-semibold text-gray-800 dark:text-zinc-300">{col}</td>
                                <td className="p-3" colSpan={3}>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        placeholder="Marks"
                                        value={inputMarks}
                                        onChange={(e) =>
                                          setInputMarks(e.target.value === "" ? "" : Number(e.target.value))
                                        }
                                        className="w-16 rounded-lg border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                                      />
                                      <span className="text-gray-400">/</span>
                                      <input
                                        type="number"
                                        placeholder="Total"
                                        value={inputTotal}
                                        onChange={(e) =>
                                          setInputTotal(e.target.value === "" ? "" : Number(e.target.value))
                                        }
                                        className="w-16 rounded-lg border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Remarks (optional)"
                                      value={inputRemarks}
                                      onChange={(e) => setInputRemarks(e.target.value)}
                                      className="flex-1 min-w-[120px] rounded-lg border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-1 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                                    />
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleSaveGrade(col)}
                                      className="p-1 rounded bg-[#EA580C]/10 text-[#EA580C] hover:bg-[#EA580C]/20 transition-all"
                                      title="Save score"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingColName(null)}
                                      className="p-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-all"
                                      title="Cancel"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          const grade = entry ? computeGrade(entry.marks, entry.totalMarks) : "—";
                          return (
                            <tr
                              key={index}
                              className="border-b border-gray-100 dark:border-zinc-900 hover:bg-gray-50/40 dark:hover:bg-zinc-900/10 transition-colors last:border-b-0 text-gray-800 dark:text-zinc-300"
                            >
                              <td className="p-3 font-medium text-gray-900 dark:text-zinc-150">{col}</td>
                              <td className="p-3 font-semibold">
                                {entry ? `${entry.marks}/${entry.totalMarks}` : "—"}
                              </td>
                              <td className={`p-3 font-bold ${gradeColor(grade)}`}>{grade}</td>
                              <td className="p-3 text-gray-500 dark:text-zinc-400 max-w-[180px] truncate">
                                {entry?.remarks || "—"}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleEditGradeClick(col)}
                                  className="text-[11px] font-semibold text-[#EA580C] dark:text-orange-400 hover:underline"
                                >
                                  {entry ? "Edit" : "Add"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance & Remarks (Right Side) */}
            <div className="flex flex-col gap-6">
              {/* Attendance Card */}
              <div className="rounded-3xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">Attendance</h3>
                  {attendanceStatus !== "idle" && (
                    <span className="text-[10px] font-semibold text-[#EA580C]">
                      {attendanceStatus === "saving" ? "Saving..." : "Saved"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 95"
                      value={localAttendance}
                      onChange={(e) => {
                        setLocalAttendance(e.target.value);
                        setAttendanceStatus("idle");
                      }}
                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 pl-4 pr-8 py-2.5 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-semibold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-zinc-500 font-bold">
                      %
                    </span>
                  </div>
                  {localAttendance !== "" && (
                    <span className={`text-sm ${getAttendanceClass(Number(localAttendance))}`}>
                      {Number(localAttendance) >= 80 ? "Good" : Number(localAttendance) >= 60 ? "Avg" : "Poor"}
                    </span>
                  )}
                </div>
              </div>

              {/* Remarks Card */}
              <div className="rounded-3xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">Teacher Remarks</h3>
                  {remarksStatus !== "idle" && (
                    <span className="text-[10px] font-semibold text-[#EA580C]">
                      {remarksStatus === "saving" ? "Saving..." : "Saved"}
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  placeholder="Add your remarks about this student..."
                  value={localRemarks}
                  onChange={(e) => {
                    setLocalRemarks(e.target.value);
                    setRemarksStatus("idle");
                  }}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 px-3 py-2 text-sm text-gray-905 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-gray-400 leading-relaxed resize-none"
                />
              </div>

              {/* Danger Zone */}
              <div className="rounded-3xl border border-red-150/40 dark:border-red-950/20 bg-red-50/10 dark:bg-red-950/5 p-6 border border-gray-150">
                <h3 className="text-sm font-bold text-red-650 dark:text-red-400 mb-2">Danger Zone</h3>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-normal mb-4">
                  Removing this student from the class group will permanently delete their grades and details.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full text-center text-xs font-semibold text-red-650 dark:text-red-450 border border-red-200 dark:border-red-900/30 bg-white dark:bg-zinc-950 rounded-full py-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                >
                  Remove from Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && currentStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 mb-2">
                Remove Student?
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to remove <strong>{currentStudent.name}</strong> from this group? This action is permanent and deletes all grades.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStudent}
                  disabled={isDeleting}
                  className="rounded-full bg-red-600 text-white px-5 py-2.5 text-xs font-semibold shadow hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {isDeleting ? "Removing..." : "Remove Student"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Details Modal */}
      <AnimatePresence>
        {showEditModal && currentStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">Edit Student Details</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-150 dark:hover:bg-zinc-900 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditDetailsSubmit} className="flex flex-col gap-4">
                {/* Roll Number */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={editRoll}
                    onChange={(e) => {
                      setEditRoll(e.target.value);
                      setEditError(null);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-900/50 text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all ${
                      editError ? "border-red-500 focus:ring-red-500" : "border-gray-200 dark:border-zinc-800"
                    }`}
                  />
                  {editError && (
                    <span className="text-[10px] font-semibold text-red-500 mt-1">{editError}</span>
                  )}
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-55 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDetails}
                    className="rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 px-5 py-2 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                  >
                    {isSavingDetails ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default StudentProfilePage;
