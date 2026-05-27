import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";
import { toolkitApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type AssignmentType = "essay" | "project" | "presentation" | "lab-report" | "creative" | "other";

interface RubricResponse {
  _id: string;
  metadata: {
    assignmentTitle: string;
    assignmentType: string;
    gradeLevel: string;
    totalMarks: number;
    generatedAt: string;
  };
  criteria: {
    name: string;
    weight: number;
    marks: number;
    levels: {
      label: string;
      score: number;
      descriptor: string;
    }[];
  }[];
}

const ASSIGNMENT_TYPES = [
  { value: "essay", label: "Essay" },
  { value: "project", label: "Project" },
  { value: "presentation", label: "Presentation" },
  { value: "lab-report", label: "Lab Report" },
  { value: "creative", label: "Creative" },
  { value: "other", label: "Other" },
];

export const RubricPage: React.FC = () => {
  const navigate = useNavigate();
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("essay");
  const [gradeLevel, setGradeLevel] = useState("");
  const [totalMarks, setTotalMarks] = useState<number>(20);
  const [criteria, setCriteria] = useState("");
  const [performanceLevels, setPerformanceLevels] = useState<number>(4);

  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<RubricResponse | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentTitle || !assignmentType || !gradeLevel || !totalMarks) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (totalMarks < 10) {
      toast.error("Total marks must be at least 10.");
      return;
    }

    setLoading(true);
    try {
      const res = await toolkitApi.generateRubric({
        assignmentTitle,
        assignmentType,
        gradeLevel,
        totalMarks,
        criteria: criteria || undefined,
        performanceLevels,
      });

      if (res.data && res.data.success) {
        setOutput(res.data.data);
        toast.success("Rubric generated successfully!");
      } else {
        toast.error("Failed to generate rubric");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || "Generation request failed";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!output) return;
    setDownloadingPdf(true);
    try {
      const pdfUrl = toolkitApi.getRubricPdfUrl(output._id);
      window.open(pdfUrl, "_blank");
      toast.success("Downloading rubric PDF...");
    } catch (err) {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleReset = () => {
    setOutput(null);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto font-sans pb-24">
        {/* Back and Title header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/toolkit")}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Toolkit</span>
          </button>
        </div>

        {loading ? (
          /* Spinner Loading State */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent mb-4"></div>
            <p className="text-sm font-semibold text-gray-600">Generating your rubric...</p>
          </div>
        ) : !output ? (
          /* Form State */
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Instant Rubric Designer</h2>
              <p className="text-xs text-gray-500">Generate a professional, multi-criteria grading rubric tailored to your assignment.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Assignment Title *</label>
                  <input
                    type="text"
                    required
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="e.g. Persuasive Essay on Climate, Bridge Building Project"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Assignment Type *</label>
                  <select
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    {ASSIGNMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Grade Level *</label>
                  <input
                    type="text"
                    required
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="e.g. Grade 9, Class 10"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Total Marks *</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g. 20 (min 10)"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Custom Criteria (optional)</label>
                <textarea
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  placeholder="e.g. Content, Creativity, Grammar, Citations — leave blank to let AI decide"
                  rows={3}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">Performance Levels</label>
                <div className="flex gap-2">
                  {([3, 4, 5] as const).map((levels) => (
                    <button
                      key={levels}
                      type="button"
                      onClick={() => setPerformanceLevels(levels)}
                      className={`h-10 w-12 text-xs font-bold rounded-xl border flex items-center justify-center transition-all ${
                        performanceLevels === levels
                          ? "bg-black border-black text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {levels}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white hover:bg-gray-900 font-bold py-3.5 px-6 rounded-full text-sm tracking-wide shadow-sm transition-all"
              >
                Generate Rubric
              </button>
            </form>
          </div>
        ) : (
          /* Output State */
          <div className="space-y-8 animate-fade-in">
            {/* Header and top buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Rubric — {output.metadata.assignmentTitle}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Grade Level: <span className="font-semibold text-gray-700">{output.metadata.gradeLevel}</span> | Assignment Type: <span className="font-semibold text-gray-700 uppercase">{output.metadata.assignmentType}</span>
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:border-gray-300 hover:text-black transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download as PDF</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-900 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Generate Another</span>
                </button>
              </div>
            </div>

            {/* Rubric HTML Table with borders and clean styling */}
            <div className="rounded-2xl border border-gray-150 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-spacing-0">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150">
                      <th className="p-4 text-xs font-bold text-gray-900 border-r border-gray-150 w-[160px]">
                        Criteria
                      </th>
                      {output.criteria[0]?.levels.map((level, lIdx) => (
                        <th key={lIdx} className="p-4 text-xs font-bold text-gray-900 border-r border-gray-150 last:border-r-0 text-center">
                          {level.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {output.criteria.map((crit, cIdx) => (
                      <tr
                        key={cIdx}
                        className={`border-b border-gray-150 last:border-b-0 ${
                          cIdx % 2 === 1 ? "bg-gray-50/40" : "bg-white"
                        }`}
                      >
                        <td className="p-4 border-r border-gray-150 align-top">
                          <h4 className="text-xs font-bold text-gray-900 mb-1">{crit.name}</h4>
                          <span className="inline-block text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 mt-1">
                            {crit.weight}% | {crit.marks} Marks
                          </span>
                        </td>
                        {crit.levels.map((level, lIdx) => (
                          <td key={lIdx} className="p-4 border-r border-gray-150 last:border-r-0 align-top text-xs text-gray-600 leading-relaxed">
                            <div className="font-bold text-gray-900 mb-1.5 text-center">
                              {level.score} M
                            </div>
                            <div>{level.descriptor}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary total marks */}
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-700">Evaluation Total Summary</h4>
                <p className="text-xs text-gray-500 mt-0.5">Sum of all criteria weights equals 100%.</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white border border-gray-150 rounded-xl px-4 py-2 text-center shadow-sm">
                  <span className="text-[10px] font-semibold text-gray-400 block uppercase">Total Weight</span>
                  <span className="text-sm font-bold text-gray-900">100%</span>
                </div>
                <div className="bg-white border border-gray-150 rounded-xl px-4 py-2 text-center shadow-sm">
                  <span className="text-[10px] font-semibold text-gray-400 block uppercase">Total Marks</span>
                  <span className="text-sm font-bold text-gray-900">{output.metadata.totalMarks} Marks</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
export default RubricPage;
