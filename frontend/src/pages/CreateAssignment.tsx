import React, { useRef, useState } from "react";
import axios, { AxiosError } from "axios";

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}
import { useNavigate } from "react-router-dom";
import { Upload, Calendar, X, Plus, Minus, Mic, BookOpen, ChevronDown, Check } from "lucide-react";
import { useAssessmentStore } from "@/store/assessmentStore";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { courseApi, toolkitApi } from "@/lib/api";

const QUESTION_TYPES = [
  "Multiple Choice Questions",
  "Short Questions",
  "Diagram/Graph-Based Questions",
  "Numerical Problems",
  "Long Answer Questions",
  "True/False Questions",
  "Fill in the Blanks"
];

export const CreateAssignment: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const {
    title,
    subject,
    duration,
    dueDate,
    instructions,
    sourceFile,
    questionRows,
    loading,
    setTitle,
    setSubject,
    setDuration,
    setDueDate,
    setInstructions,
    setSourceFile,
    addRow,
    removeRow,
    updateRowType,
    updateRowCount,
    updateRowMarks,
    submitForm,
  } = useAssessmentStore();

  // Question Bank Helper state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [qbQuestions, setQbQuestions] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedQbId, setSelectedQbId] = useState<string>("");
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [loadingQbs, setLoadingQbs] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Calculate totals
  const totalQuestions = questionRows.reduce((sum, r) => sum + r.count, 0);
  const totalMarks = questionRows.reduce((sum, r) => sum + r.count * r.marks, 0);

  // File Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Accept pdf, images, txt
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "text/plain"];
      if (validTypes.includes(file.type) || file.name.endsWith(".txt") || file.name.endsWith(".pdf")) {
        setSourceFile(file);
        toast.success(`File "${file.name}" uploaded successfully`);
      } else {
        toast.error("Unsupported file type! Please upload PDF, images (JPEG/PNG) or TXT files.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceFile(file);
      toast.success(`File "${file.name}" uploaded successfully`);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSourceFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("File cleared");
  };

  // Question Bank Helper handlers
  const handleOpenDrawer = async () => {
    setIsDrawerOpen(true);
    if (courses.length === 0) {
      try {
        const res = await courseApi.listCourses();
        setCourses(res.data || []);
      } catch (err) {
        toast.error("Failed to load courses");
      }
    }
  };

  const handleSelectCourse = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedQbId("");
    setQbQuestions([]);
    setQuestionBanks([]);
    setLoadingQbs(true);
    try {
      const res = await courseApi.listQuestionBanks(courseId);
      setQuestionBanks(res.data || []);
    } catch (err) {
      toast.error("Failed to load question banks");
    } finally {
      setLoadingQbs(false);
    }
  };

  const handleSelectQb = async (qbId: string) => {
    setSelectedQbId(qbId);
    setQbQuestions([]);
    setLoadingQuestions(true);
    try {
      const res = await toolkitApi.getQuestionBank(qbId);
      if (res.data && res.data.success && res.data.data) {
        setQbQuestions(res.data.data.questions || []);
      } else {
        toast.error("Failed to fetch questions for this question bank");
      }
    } catch (err) {
      toast.error("Failed to load questions");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleToggleQuestion = (question: any) => {
    setCustomQuestions((prev) => {
      const exists = prev.some((q) => q.questionText === question.questionText);
      if (exists) {
        toast.info("Removed question from pre-selected list");
        return prev.filter((q) => q.questionText !== question.questionText);
      } else {
        toast.success("Added question to pre-selected list");
        return [...prev, question];
      }
    });
  };

  const removeCustomQuestion = (index: number) => {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
    toast.info("Removed question");
  };

  // Submit Handler
  const handleNext = async () => {
    if (totalQuestions <= 0) {
      toast.error("Please add at least 1 question type with a count > 0.");
      return;
    }

    const originalInstructions = instructions;
    let finalInstructions = instructions;

    if (customQuestions.length > 0) {
      const questionsText = customQuestions
        .map((q, idx) => {
          let qStr = `Question ${idx + 1}: [${q.type.toUpperCase()}] [${q.difficulty.toUpperCase()}] [${q.marks} Marks]\n${q.questionText}`;
          if (q.type === "mcq" && q.options && q.options.length > 0) {
            qStr += `\nOptions:\n` + q.options.map((opt: string, oIdx: number) => `  ${String.fromCharCode(65 + oIdx)}) ${opt}`).join("\n");
          }
          if (q.correctAnswer) {
            qStr += `\nCorrect Answer/Key: ${q.correctAnswer}`;
          }
          return qStr;
        })
        .join("\n\n");

      finalInstructions = (instructions ? instructions + "\n\n" : "") +
        `IMPORTANT: You must include the following pre-selected questions in the generated assignment exactly as specified:\n\n${questionsText}`;
    }

    try {
      setInstructions(finalInstructions);
      const result = await submitForm();
      toast.success("Assessment generation started!");
      navigate(`/assignments/${result.assessmentId}?jobId=${result.jobId}`);
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error?.message || "Failed to initiate generation");
    } finally {
      setInstructions(originalInstructions);
    }
  };

  return (
    <Layout>
      {/* Subheader */}
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Create Assignment</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Set up a new assignment for your students</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 flex w-full items-center justify-between gap-1.5 px-0.5">
        <div className="h-1.5 w-[55%] rounded-full bg-[#111111] dark:bg-white" />
        <div className="h-1.5 w-[44%] rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-[0_2px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.2)] max-w-4xl mx-auto font-sans mb-12">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Assignment Details</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Basic information about your assignment</p>
        </div>

        {/* Upload Box */}
        <div className="mb-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
              dragActive ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="hidden"
              onChange={handleFileChange}
            />

            {sourceFile ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 mb-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-850 dark:text-gray-200 mb-1">{sourceFile.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{(sourceFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button
                  type="button"
                  onClick={clearFile}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Remove File</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 mb-3 shadow-inner">
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  Choose a file or drag & drop it here
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">JPEG, PNG, PDF, TXT upto 10MB</p>
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-355 px-4 py-2 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors shadow-sm"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>
          {/* Caption BELOW box */}
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500 regular">
            Upload images of your preferred document/image
          </p>
        </div>

        {/* Form Fields: Subject, Duration, Title */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-355 block mb-1">Assignment Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              placeholder="e.g. Electricity Quiz"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-355 block mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-550 focus:border-black dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              placeholder="e.g. Science"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-355 block mb-1">Duration (minutes)</label>
            <input
              type="number"
              value={duration || ""}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-555 focus:border-black dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              placeholder="e.g. 45"
            />
          </div>
        </div>

        {/* Due Date field: Matches upload-material.png */}
        <div className="mb-8">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-355 block mb-1">Due Date</label>
          <div className="relative max-w-md">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-855 py-2.5 pl-4 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Question Types Form: Matches upload-material.png */}
        <div className="mb-6">
          {/* Table Column Headers */}
          <div className="grid grid-cols-12 gap-4 px-1 mb-2">
            <div className="col-span-7 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              Question Type
            </div>
            <div className="col-span-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 text-right pr-4">
              No. of Questions
            </div>
            <div className="col-span-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 text-right pr-2">
              Marks
            </div>
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-4">
            {questionRows.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-4 items-center">
                {/* Select dropdown */}
                <div className="col-span-7">
                  <select
                    value={row.type}
                    onChange={(e) => updateRowType(row.id, e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white appearance-none"
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remove button & Question count counter */}
                <div className="col-span-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-2 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateRowCount(row.id, row.count - 1)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-gray-200">
                      {row.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateRowCount(row.id, row.count + 1)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Marks counter */}
                <div className="col-span-2 flex items-center justify-end">
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-2 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateRowMarks(row.id, row.marks - 1)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-gray-200">
                      {row.marks}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateRowMarks(row.id, row.marks + 1)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button & Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 gap-4">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-250 hover:text-black dark:hover:text-white hover:underline"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black">
                <Plus className="h-4.5 w-4.5" />
              </div>
              <span>Add Question Type</span>
            </button>

            <div className="flex flex-col items-end gap-1 font-sans text-xs text-gray-600 dark:text-gray-400 font-semibold text-right">
              <div>Total Questions : {totalQuestions}</div>
              <div>Total Marks : {totalMarks}</div>
            </div>
          </div>
        </div>

        {/* Selected custom questions preview */}
        {customQuestions.length > 0 && (
          <div className="mb-6 rounded-2xl border border-dashed border-gray-205 dark:border-gray-750 bg-gray-50/50 dark:bg-gray-900/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Selected Questions from Question Bank ({customQuestions.length})
              </h4>
              <button
                type="button"
                onClick={() => setCustomQuestions([])}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {customQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-905 shadow-sm"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30">
                        {q.type}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-gray-400">
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-gray-900 dark:bg-gray-750 text-white dark:text-gray-200">
                        {q.marks} Mark{q.marks > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                      {q.questionText}
                    </p>
                    {q.type === "mcq" && q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-1.5 pl-2">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div key={oIdx} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <span className="font-semibold text-gray-400">{String.fromCharCode(65 + oIdx)})</span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomQuestion(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
              Additional Information (For better output)
            </label>
            <button
              type="button"
              onClick={handleOpenDrawer}
              className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Use Question Bank Helper</span>
            </button>
          </div>
          <div className="relative">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Generate a question paper for 3 hour exam duration..."
              rows={4}
              className="block w-full rounded-2xl border border-gray-200 dark:border-gray-700 p-4 pr-12 text-sm bg-white dark:bg-gray-850 text-gray-905 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white resize-none"
            />
            <button
              type="button"
              onClick={() => toast.info("Voice input coming soon!")}
              className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-705 border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 transition-all"
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Nav Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-gray-200 dark:border-gray-700 px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-transparent"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 text-sm font-semibold hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white dark:border-black border-t-transparent"></div>
            ) : (
              <span>Next →</span>
            )}
          </button>
        </div>
      </div>

      {/* Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-gray-905 border-l border-gray-100 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Question Bank Helper</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* 1. Select Course */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              1. Select Course Folder
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleSelectCourse(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white appearance-none"
            >
              <option value="" disabled>Choose a folder...</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select Question Bank */}
          {selectedCourseId && (
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                2. Choose Question Bank
              </label>
              {loadingQbs ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                </div>
              ) : questionBanks.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">No question banks found for this course folder.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  {questionBanks.map((qb) => (
                    <div
                      key={qb._id}
                      onClick={() => handleSelectQb(qb._id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedQbId === qb._id
                          ? "border-orange-500 bg-orange-50/20 dark:bg-orange-950/20"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                      }`}
                    >
                      <p className="text-xs font-bold text-gray-850 dark:text-gray-200">{qb.metadata.title}</p>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                        <span>{qb.metadata.subject}</span>
                        <span>{qb.metadata.questionCount} Questions</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Question List */}
          {selectedQbId && (
            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-505 dark:text-gray-400 block mb-1">
                3. Select Questions to Import
              </label>
              {loadingQuestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                </div>
              ) : qbQuestions.length === 0 ? (
                <p className="text-xs text-gray-450 dark:text-gray-500 italic">No questions inside this bank.</p>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {qbQuestions.map((q) => {
                    const isSelected = customQuestions.some(
                      (cq) => cq.questionText === q.questionText
                    );
                    return (
                      <div
                        key={q.questionNumber}
                        onClick={() => handleToggleQuestion(q)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex gap-3 ${
                          isSelected
                            ? "border-orange-500 bg-orange-50/20 dark:bg-orange-950/20"
                            : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                        }`}
                      >
                        <div className={`mt-0.5 h-4.5 w-4.5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
                          isSelected
                            ? "bg-orange-500 border-orange-500 text-white"
                            : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-805 text-gray-655 dark:text-gray-400">
                              {q.type}
                            </span>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-805 text-gray-655 dark:text-gray-400">
                              {q.difficulty}
                            </span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200">
                              {q.marks} Mark{q.marks > 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
                            {q.questionText}
                          </p>
                          {q.type === "mcq" && q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 mt-1.5 pl-1">
                              {q.options.map((opt: string, oIdx: number) => (
                                <div key={oIdx} className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <span className="font-semibold text-gray-300">{String.fromCharCode(65 + oIdx)})</span>
                                  <span className="truncate">{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-6 bg-gray-50/50 dark:bg-gray-950/20">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="w-full rounded-full bg-black dark:bg-white text-white dark:text-black py-3 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-gray-900 dark:hover:bg-gray-100 shadow-sm"
          >
            Done Adding ({customQuestions.length} Selected)
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default CreateAssignment;
