import React, { useRef, useState } from "react";
import axios, { AxiosError } from "axios";

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}
import { useNavigate } from "react-router-dom";
import { Upload, Calendar, X, Plus, Minus, Mic } from "lucide-react";
import { useAssessmentStore } from "@/store/assessmentStore";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";

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

  // Submit Handler
  const handleNext = async () => {
    if (totalQuestions <= 0) {
      toast.error("Please add at least 1 question type with a count > 0.");
      return;
    }

    try {
      const result = await submitForm();
      toast.success("Assessment generation started!");
      // Route to output page with jobId as search param
      navigate(`/assignments/${result.assessmentId}?jobId=${result.jobId}`);
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error?.message || "Failed to initiate generation");
    }
  };

  return (
    <Layout>
      {/* Subheader */}
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <h2 className="text-xl font-bold text-gray-800">Create Assignment</h2>
        </div>
        <p className="text-sm text-gray-500">Set up a new assignment for your students</p>
      </div>

      {/* Progress Bar: Matches upload-material.png */}
      <div className="mb-6 flex w-full items-center justify-between gap-1.5 px-0.5">
        <div className="h-1.5 w-[55%] rounded-full bg-[#111111]" />
        <div className="h-1.5 w-[44%] rounded-full bg-gray-200" />
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.02)] max-w-4xl mx-auto font-sans mb-12">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">Assignment Details</h3>
          <p className="text-xs text-gray-400 font-medium">Basic information about your assignment</p>
        </div>

        {/* Upload Box */}
        <div className="mb-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
              dragActive ? "border-black bg-gray-50" : "border-gray-200 bg-white"
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
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 mb-3">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{sourceFile.name}</p>
                <p className="text-xs text-gray-400 mb-4">{(sourceFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button
                  onClick={clearFile}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Remove File</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-500 border border-gray-100 mb-3 shadow-inner">
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  Choose a file or drag & drop it here
                </p>
                <p className="text-xs text-gray-400 mb-4">JPEG, PNG, PDF, TXT upto 10MB</p>
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>
          {/* Caption BELOW box */}
          <p className="mt-2 text-center text-[11px] text-gray-400 regular">
            Upload images of your preferred document/image
          </p>
        </div>

        {/* Form Fields: Subject, Duration, Title */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Assignment Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="e.g. Electricity Quiz"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="e.g. Science"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Duration (minutes)</label>
            <input
              type="number"
              value={duration || ""}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="e.g. 45"
            />
          </div>
        </div>

        {/* Due Date field: Matches upload-material.png */}
        <div className="mb-8">
          <label className="text-sm font-semibold text-gray-700 block mb-1">Due Date</label>
          <div className="relative max-w-md">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="block w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
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
            <div className="col-span-7 text-[11px] font-semibold text-gray-400">
              Question Type
            </div>
            <div className="col-span-3 text-[11px] font-semibold text-gray-400 text-right pr-4">
              No. of Questions
            </div>
            <div className="col-span-2 text-[11px] font-semibold text-gray-400 text-right pr-2">
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
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black appearance-none"
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
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-2 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateRowCount(row.id, row.count - 1)}
                      className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-800">
                      {row.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateRowCount(row.id, row.count + 1)}
                      className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Marks counter */}
                <div className="col-span-2 flex items-center justify-end">
                  <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-2 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateRowMarks(row.id, row.marks - 1)}
                      className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-800">
                      {row.marks}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateRowMarks(row.id, row.marks + 1)}
                      className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button & Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 pt-4 border-t border-gray-50 gap-4">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-2 text-sm font-bold text-gray-800 hover:text-black hover:underline"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white">
                <Plus className="h-4.5 w-4.5" />
              </div>
              <span>Add Question Type</span>
            </button>

            <div className="flex flex-col items-end gap-1 font-sans text-xs text-gray-600 font-semibold text-right">
              <div>Total Questions : {totalQuestions}</div>
              <div>Total Marks : {totalMarks}</div>
            </div>
          </div>
        </div>

        {/* Additional Information (Mic layout) */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700 block mb-1">
            Additional Information (For better output)
          </label>
          <div className="relative">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Generate a question paper for 3 hour exam duration..."
              rows={4}
              className="block w-full rounded-2xl border border-gray-200 p-4 pr-12 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none"
            />
            <button
              type="button"
              onClick={() => toast.info("Voice input coming soon!")}
              className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-500 hover:text-black transition-all"
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Nav Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <span>Next →</span>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};
export default CreateAssignment;
