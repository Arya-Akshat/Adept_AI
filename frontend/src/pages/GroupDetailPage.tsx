import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Grid,
  Search,
  Upload,
  Download,
  Plus,
  Edit,
  Trash2,
  Edit2,
  Trash,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  X,
  Check
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { useGroupsStore } from "@/store/groupsStore";
import { groupsApi } from "@/lib/api";
import { AddStudentModal } from "@/components/AddStudentModal";
import { ImportCSVModal } from "@/components/ImportCSVModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const groupId = id || "";

  const {
    currentGroup,
    setCurrentGroup,
    students,
    totalStudents,
    fetchStudents,
    updateGroup,
    deleteGroup,
    loading
  } = useGroupsStore();

  const [activeTab, setActiveTab] = useState<"students" | "columns">("students");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Modal open states
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);

  // Grade column action states
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [editingColValue, setEditingColValue] = useState("");
  const [newColName, setNewColName] = useState("");
  const [colToDelete, setColToDelete] = useState<string | null>(null);
  const [isModifyingCols, setIsModifyingCols] = useState(false);

  // Group Details edit states
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupSubject, setEditGroupSubject] = useState("");
  const [editGroupGrade, setEditGroupGrade] = useState("");
  const [editGroupYear, setEditGroupYear] = useState("");

  // Fetch Group on mount
  useEffect(() => {
    const loadGroup = async () => {
      try {
        const response = await groupsApi.getGroup(groupId);
        setCurrentGroup(response.data.data.group);
      } catch (err: any) {
        toast.error("Failed to load group details");
        navigate("/groups");
      }
    };
    loadGroup();

    return () => {
      setCurrentGroup(null);
    };
  }, [groupId, setCurrentGroup, navigate]);

  // Debounced search + page fetch for students
  useEffect(() => {
    if (!groupId) return;
    const delayDebounceFn = setTimeout(() => {
      fetchStudents(groupId, { search, page, limit: 20 }).catch(() => {});
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, page, groupId, fetchStudents]);

  const handleEditGroupClick = () => {
    if (!currentGroup) return;
    setEditGroupName(currentGroup.name);
    setEditGroupSubject(currentGroup.subject);
    setEditGroupGrade(currentGroup.grade);
    setEditGroupYear(currentGroup.academicYear);
    setShowEditGroupModal(true);
  };

  const handleEditGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupName.trim() || !editGroupSubject.trim()) return;

    try {
      await updateGroup(groupId, {
        name: editGroupName.trim(),
        subject: editGroupSubject.trim(),
        grade: editGroupGrade.trim(),
        academicYear: editGroupYear.trim(),
      });
      toast.success("Group updated successfully");
      setShowEditGroupModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update group");
    }
  };

  const handleDeleteGroup = async () => {
    setIsDeletingGroup(true);
    try {
      await deleteGroup(groupId);
      toast.success("Group deleted successfully");
      navigate("/groups");
    } catch (err: any) {
      toast.error("Failed to delete group");
    } finally {
      setIsDeletingGroup(false);
      setShowDeleteGroupConfirm(false);
    }
  };

  const handleExportCSV = async () => {
    if (!currentGroup) return;
    setIsExporting(true);
    try {
      const response = await groupsApi.exportStudents(groupId);
      // Create download link from Blob
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${currentGroup.name}-students.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV exported successfully");
    } catch (err) {
      toast.error("Failed to export students list");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup || isModifyingCols) return;
    const nameTrimmed = newColName.trim();
    if (!nameTrimmed) return;

    if (
      currentGroup.subjectColumns.some(
        (c) => c.toLowerCase().trim() === nameTrimmed.toLowerCase()
      )
    ) {
      toast.error("Column name already exists");
      return;
    }

    setIsModifyingCols(true);
    try {
      await updateGroup(groupId, {
        subjectColumns: [...currentGroup.subjectColumns, nameTrimmed],
      });
      setNewColName("");
      toast.success("Column added successfully");
    } catch (err) {
      toast.error("Failed to add column");
    } finally {
      setIsModifyingCols(false);
    }
  };

  const handleRenameColumn = async (index: number) => {
    if (!currentGroup || isModifyingCols) return;
    const newValue = editingColValue.trim();
    if (!newValue) {
      setEditingColIndex(null);
      return;
    }

    if (newValue === currentGroup.subjectColumns[index]) {
      setEditingColIndex(null);
      return;
    }

    if (
      currentGroup.subjectColumns.some(
        (c, idx) => idx !== index && c.toLowerCase().trim() === newValue.toLowerCase()
      )
    ) {
      toast.error("Column name already exists");
      return;
    }

    setIsModifyingCols(true);
    try {
      const updatedCols = [...currentGroup.subjectColumns];
      updatedCols[index] = newValue;
      await updateGroup(groupId, { subjectColumns: updatedCols });
      setEditingColIndex(null);
      toast.success("Column renamed successfully");
    } catch (err) {
      toast.error("Failed to rename column");
    } finally {
      setIsModifyingCols(false);
    }
  };

  const handleDeleteColumnConfirm = async () => {
    if (!currentGroup || !colToDelete || isModifyingCols) return;

    setIsModifyingCols(true);
    try {
      const updatedCols = currentGroup.subjectColumns.filter((c) => c !== colToDelete);
      await updateGroup(groupId, { subjectColumns: updatedCols });
      toast.success("Column deleted successfully");
    } catch (err) {
      toast.error("Failed to delete column");
    } finally {
      setIsModifyingCols(false);
      setColToDelete(null);
    }
  };

  const getAttendanceColor = (pct: number | null) => {
    if (pct === null) return "text-gray-400 dark:text-zinc-500";
    if (pct >= 80) return "text-green-600 dark:text-green-400 font-semibold";
    if (pct >= 60) return "text-yellow-600 dark:text-yellow-500 font-semibold";
    return "text-red-600 dark:text-red-400 font-semibold";
  };

  const totalPages = Math.ceil(totalStudents / 20) || 1;

  return (
    <Layout>
      {/* Back Button */}
      <div className="mb-4 font-sans">
        <button
          onClick={() => navigate("/groups")}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Groups</span>
        </button>
      </div>

      {/* Header Panel */}
      {currentGroup ? (
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-sans border-b border-gray-100 dark:border-zinc-900 pb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 leading-tight">
              {currentGroup.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
              {currentGroup.subject} · {currentGroup.grade} · {currentGroup.academicYear}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEditGroupClick}
              className="flex items-center gap-1.5 rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setShowDeleteGroupConfirm(true)}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 h-16 w-1/2 rounded-2xl bg-gray-100 dark:bg-zinc-900 animate-pulse" />
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-150 dark:border-zinc-850 mb-6 font-sans">
        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "students"
              ? "border-[#EA580C] text-[#EA580C] dark:text-orange-400"
              : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Students</span>
        </button>
        <button
          onClick={() => setActiveTab("columns")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "columns"
              ? "border-[#EA580C] text-[#EA580C] dark:text-orange-400"
              : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
          }`}
        >
          <Grid className="h-4 w-4" />
          <span>Grade Columns</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="font-sans pb-24">
        {activeTab === "students" ? (
          /* STUDENTS TAB CONTAINER */
          <div className="flex flex-col gap-6">
            {/* Toolbar Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or roll no..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 pr-4 py-2 text-xs text-gray-950 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-gray-400"
                />
              </div>

              {/* Roster Actions */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsImportCSVOpen(true)}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-40"
                >
                  {isExporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
                </button>
                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            {loading && students.length === 0 ? (
              /* Skeletons Table rows */
              <div className="flex flex-col border border-gray-150 dark:border-zinc-850 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-900 p-4 animate-pulse">
                    <div className="h-4 w-12 rounded bg-gray-100 dark:bg-zinc-900" />
                    <div className="h-4 w-28 rounded bg-gray-100 dark:bg-zinc-900" />
                    <div className="h-4 w-36 rounded bg-gray-100 dark:bg-zinc-900" />
                    <div className="h-4 w-16 rounded bg-gray-100 dark:bg-zinc-900" />
                    <div className="h-4 w-8 rounded bg-gray-100 dark:bg-zinc-900" />
                  </div>
                ))}
              </div>
            ) : students.length === 0 ? (
              /* Empty Students State */
              <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50/20 dark:bg-zinc-900/5">
                <Users className="h-8 w-8 text-gray-400 dark:text-zinc-500 mb-3" />
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-250 mb-0.5">
                  No students yet
                </p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mb-4 max-w-xs">
                  Create manual student entries or upload a roster spreadsheet to get started.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsImportCSVOpen(true)}
                    className="flex items-center gap-1 rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-350 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload CSV</span>
                  </button>
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="flex items-center gap-1 rounded-full bg-zinc-950 dark:bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-all shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Manually</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Roster Table Content */
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto rounded-2xl border border-gray-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 shadow-sm">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-zinc-850 bg-gray-50 dark:bg-zinc-900/50 font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                        <th className="p-4 w-28">Roll No</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4 w-32">Attendance</th>
                        <th className="p-4 w-20 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr
                          key={student._id}
                          onClick={() => navigate(`/groups/${groupId}/students/${student._id}`)}
                          className="border-b border-gray-100 dark:border-zinc-900 text-gray-800 dark:text-zinc-250 hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 cursor-pointer transition-all last:border-b-0"
                        >
                          <td className="p-4 font-bold text-gray-900 dark:text-zinc-150 text-[14px]">
                            {student.rollNumber}
                          </td>
                          <td className="p-4 font-medium">{student.name}</td>
                          <td className="p-4 text-xs text-gray-400 dark:text-zinc-500 max-w-xs truncate">
                            {student.email || "—"}
                          </td>
                          <td className={`p-4 text-xs ${getAttendanceColor(student.attendancePercent)}`}>
                            {student.attendancePercent !== null ? `${student.attendancePercent}%` : "—"}
                          </td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/groups/${groupId}/students/${student._id}`)}
                              className="text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white px-2 py-1 rounded transition-colors"
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-2 px-2 text-xs font-medium text-gray-500 dark:text-zinc-400">
                    <span>
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalStudents} total)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-gray-55 disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-gray-55 disabled:opacity-40 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* GRADE COLUMNS TAB CONTAINER */
          <div className="flex flex-col gap-6 font-sans">
            {/* Columns List */}
            {currentGroup && currentGroup.subjectColumns.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-gray-250 dark:border-zinc-800 bg-gray-55/30 dark:bg-zinc-900/5 rounded-2xl">
                <Grid className="h-7 w-7 text-gray-400 dark:text-zinc-550 mb-2" />
                <p className="text-xs font-semibold text-gray-800 dark:text-zinc-300">
                  No grade columns defined yet
                </p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 max-w-xs">
                  Create columns like "Unit Test 1" or "Mid Term Exam" to map student scores.
                </p>
              </div>
            ) : (
              <div className="flex flex-col border border-gray-150 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {currentGroup?.subjectColumns.map((col, index) => {
                  const isEditing = editingColIndex === index;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-900 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingColValue}
                            onChange={(e) => setEditingColValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameColumn(index);
                              if (e.key === "Escape") setEditingColIndex(null);
                            }}
                            autoFocus
                            className="flex-1 max-w-xs rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <button
                            onClick={() => handleRenameColumn(index)}
                            disabled={isModifyingCols}
                            className="p-1.5 rounded-full bg-green-55 dark:bg-green-950/20 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingColIndex(null)}
                            className="p-1.5 rounded-full bg-gray-100 dark:bg-zinc-900 text-gray-500 hover:bg-gray-200 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800 dark:text-zinc-250">
                            {col}
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingColIndex(index);
                              setEditingColValue(col);
                            }}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors rounded-full p-1"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setColToDelete(col)}
                            className="text-gray-400 hover:text-red-500 transition-colors rounded-full p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Column Form */}
            <form
              onSubmit={handleAddColumn}
              className="flex items-center gap-2 max-w-md mt-2 p-4 rounded-2xl border border-gray-100 dark:border-zinc-900 bg-gray-50/50 dark:bg-zinc-900/10"
            >
              <input
                type="text"
                placeholder="New column name e.g. Final Quiz..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                disabled={isModifyingCols}
                className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2 text-xs text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!newColName.trim() || isModifyingCols}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-40 transition-colors"
              >
                {isModifyingCols ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>Add Column</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Delete Column Confirmation Modal */}
      <AnimatePresence>
        {colToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setColToDelete(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 mb-2">
                Delete Grade Column?
              </h3>
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 text-xs leading-normal mb-5">
                <AlertTriangle className="h-4.5 w-4.5 mt-0.5 flex-shrink-0" />
                <p>
                  Removing this column will <strong>NOT</strong> delete existing student grades for this column. Existing history entries will remain intact.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setColToDelete(null)}
                  disabled={isModifyingCols}
                  className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteColumnConfirm}
                  disabled={isModifyingCols}
                  className="rounded-full bg-red-600 text-white px-5 py-2.5 text-xs font-semibold shadow hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {isModifyingCols ? "Deleting..." : "Delete Column"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Group Confirmation Modal */}
      <AnimatePresence>
        {showDeleteGroupConfirm && currentGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteGroupConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 mb-2">
                Delete Group?
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to delete <strong>{currentGroup.name}</strong>? This will permanently delete the group along with all student roster data and grade entries.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteGroupConfirm(false)}
                  disabled={isDeletingGroup}
                  className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
                  disabled={isDeletingGroup}
                  className="rounded-full bg-red-600 text-white px-5 py-2.5 text-xs font-semibold shadow hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {isDeletingGroup ? "Deleting..." : "Delete Group"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {showEditGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditGroupModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">Edit Group Details</h3>
                <button
                  onClick={() => setShowEditGroupModal(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-150 dark:hover:bg-zinc-900 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditGroupSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Group Name</label>
                  <input
                    type="text"
                    required
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Subject</label>
                  <input
                    type="text"
                    required
                    value={editGroupSubject}
                    onChange={(e) => setEditGroupSubject(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Grade Level</label>
                  <input
                    type="text"
                    required
                    value={editGroupGrade}
                    onChange={(e) => setEditGroupGrade(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={editGroupYear}
                    onChange={(e) => setEditGroupYear(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setShowEditGroupModal(false)}
                    className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-55 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 px-5 py-2 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals Attachment */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        groupId={groupId}
        onSuccess={() => fetchStudents(groupId, { search, page, limit: 20 })}
      />

      <ImportCSVModal
        isOpen={isImportCSVOpen}
        onClose={() => setIsImportCSVOpen(false)}
        groupId={groupId}
        onSuccess={() => fetchStudents(groupId, { search, page, limit: 20 })}
      />
    </Layout>
  );
};

export default GroupDetailPage;
