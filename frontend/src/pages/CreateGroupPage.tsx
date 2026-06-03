import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plus, X, Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useGroupsStore } from "@/store/groupsStore";
import { toast } from "sonner";

export const CreateGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const { createGroup } = useGroupsStore();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [newColumnText, setNewColumnText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gradeOptions = [
    "Grade 1-5",
    "Grade 6-8",
    "Grade 9-10",
    "Grade 11-12",
    "College/University",
  ];

  const handleAddColumn = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newColumnText.trim();
    if (!trimmed) return;
    if (columns.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Column already exists");
      return;
    }
    setColumns([...columns, trimmed]);
    setNewColumnText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddColumn();
    }
  };

  const handleRemoveColumn = (col: string) => {
    setColumns(columns.filter((c) => c !== col));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !grade || !academicYear.trim()) return;

    setIsSubmitting(true);
    try {
      const newGroup = await createGroup({
        name: name.trim(),
        subject: subject.trim(),
        grade,
        academicYear: academicYear.trim(),
        subjectColumns: columns,
      });

      toast.success("Group created successfully");
      navigate(`/groups/${newGroup._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = name.trim() && subject.trim() && grade && academicYear.trim();

  return (
    <Layout>
      {/* Back Link */}
      <div className="mb-4 font-sans">
        <button
          onClick={() => navigate("/groups")}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Groups</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-1 font-sans">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-50">Create Group</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-450">Set up a new class group</p>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl font-sans pb-24">
        <div className="rounded-3xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 md:p-8 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">Group Details</h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-6">Basic information about this class</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Group Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Grade 9 - Section B"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 px-4 py-2.5 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-gray-400"
              />
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 px-4 py-2.5 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-gray-400"
              />
            </div>

            {/* Grade Selection (Pill Selector) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">
                Grade Category <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {gradeOptions.map((opt) => {
                  const isSelected = grade === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setGrade(opt)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-zinc-950 dark:bg-zinc-50 border-zinc-950 dark:border-zinc-50 text-white dark:text-zinc-950"
                          : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-405 hover:bg-gray-50 dark:hover:bg-zinc-855"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Academic Year */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2025-26"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 px-4 py-2.5 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-gray-400"
              />
            </div>

            {/* Grade Columns */}
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                  Grade Columns
                </label>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                  (optional — you can add or modify columns at any time later)
                </span>
              </div>

              {/* Tag Input Field */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Unit Test 1, Mid Term"
                  value={newColumnText}
                  onChange={(e) => setNewColumnText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 px-4 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => handleAddColumn()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/20 text-[#EA580C] hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Added Column Chips */}
              {columns.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1.5 p-3 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/10 border border-gray-100 dark:border-zinc-900">
                  {columns.map((col) => (
                    <span
                      key={col}
                      className="flex items-center gap-1 text-xs font-semibold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 text-gray-700 dark:text-zinc-300 rounded-full pl-3 pr-2 py-1"
                    >
                      <span>{col}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(col)}
                        className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 dark:hover:text-zinc-200 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Footer */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => navigate("/groups")}
                className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="flex items-center justify-center gap-1.5 rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 px-6 py-2.5 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-40 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Create Group</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateGroupPage;
