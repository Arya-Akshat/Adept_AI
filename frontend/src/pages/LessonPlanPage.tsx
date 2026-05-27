import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { ArrowLeft, RefreshCw, Copy, Check } from "lucide-react";
import { toolkitApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type TeachingStyle = "lecture" | "activity-based" | "discussion" | "mixed";

interface LessonPlanResponse {
  metadata: {
    topic: string;
    subject: string;
    gradeLevel: string;
    duration: number;
    generatedAt: string;
  };
  objectives: string[];
  sections: {
    title: string;
    duration: number;
    description: string;
    teacherActions: string[];
    studentActions: string[];
    materials: string[];
  }[];
  assessment: string;
  homework: string;
  teacherNotes: string;
}

export const LessonPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [duration, setDuration] = useState<number>(45);
  const [objectives, setObjectives] = useState("");
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>("mixed");

  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<LessonPlanResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !subject || !gradeLevel || !duration) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await toolkitApi.generateLessonPlan({
        topic,
        subject,
        gradeLevel,
        duration,
        objectives: objectives || undefined,
        teachingStyle,
      });

      if (res.data && res.data.success) {
        setOutput(res.data.data);
        toast.success("Lesson plan generated successfully!");
      } else {
        toast.error("Failed to generate lesson plan");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || "Generation request failed";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    const text = `LESSON PLAN: ${output.metadata.topic}
Subject: ${output.metadata.subject}
Grade Level: ${output.metadata.gradeLevel}
Duration: ${output.metadata.duration} minutes
Generated At: ${new Date(output.metadata.generatedAt).toLocaleString()}

OBJECTIVES:
${output.objectives.map((obj) => `- ${obj}`).join("\n")}

TIMELINE:
${output.sections
  .map(
    (sec) => `
* ${sec.title} (${sec.duration} mins)
  Description: ${sec.description}
  Teacher Actions:
${sec.teacherActions.map((act) => `    - ${act}`).join("\n")}
  Student Actions:
${sec.studentActions.map((act) => `    - ${act}`).join("\n")}
  Materials: ${sec.materials.join(", ") || "None"}
`
  )
  .join("\n")}

ASSESSMENT:
${output.assessment}

HOMEWORK:
${output.homework}

TEACHER NOTES:
${output.teacherNotes}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied lesson plan to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setOutput(null);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto font-sans pb-24">
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
            <p className="text-sm font-semibold text-gray-600">Generating your lesson plan...</p>
          </div>
        ) : !output ? (
          /* Form State */
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Lesson Plan Generator</h2>
              <p className="text-xs text-gray-500">Design a detailed curriculum plan with timed sections and interactive actions.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Topic *</label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Photosynthesis, Quadratic Equations"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Biology, Mathematics"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
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
                    placeholder="e.g. Grade 5, Class 8"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Duration (minutes) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g. 45"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Learning Objectives (optional)</label>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="e.g. Understand the Calvin cycle, Identify light reactions (comma-separated)"
                  rows={3}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">Teaching Style</label>
                <div className="flex flex-wrap gap-2">
                  {(["lecture", "activity-based", "discussion", "mixed"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setTeachingStyle(style)}
                      className={`px-4 py-2 text-xs font-bold rounded-full border uppercase tracking-wider transition-all ${
                        teachingStyle === style
                          ? "bg-black border-black text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {style.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white hover:bg-gray-900 font-bold py-3.5 px-6 rounded-full text-sm tracking-wide shadow-sm transition-all"
              >
                Generate Lesson Plan
              </button>
            </form>
          </div>
        ) : (
          /* Output State */
          <div className="space-y-8 animate-fade-in">
            {/* Header metadata bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Lesson Plan — {output.metadata.topic}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Subject: <span className="font-semibold text-gray-700">{output.metadata.subject}</span> | Grade: <span className="font-semibold text-gray-700">{output.metadata.gradeLevel}</span>
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:border-gray-300 hover:text-black transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied!" : "Copy as Text"}</span>
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

            {/* Chips bar */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-150 px-3.5 py-1 text-xs font-semibold text-gray-700">
                Duration: {output.metadata.duration} Mins
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-150 px-3.5 py-1 text-xs font-semibold text-gray-700">
                Grade: {output.metadata.gradeLevel}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-150 px-3.5 py-1 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Style: {teachingStyle.replace("-", " ")}
              </span>
            </div>

            {/* Objectives card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Learning Objectives</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                {output.objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>

            {/* Timeline Sections */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-900 px-1">Lesson Timeline</h3>
              
              {output.sections.map((section, sIdx) => (
                <div key={sIdx} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <h4 className="text-sm font-bold text-gray-800">{section.title}</h4>
                    <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 uppercase">
                      {section.duration} min
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">{section.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Teacher Actions</h5>
                      <ul className="list-disc pl-4 space-y-1.5 text-xs text-gray-600">
                        {section.teacherActions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Student Actions</h5>
                      <ul className="list-disc pl-4 space-y-1.5 text-xs text-gray-600">
                        {section.studentActions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {section.materials && section.materials.length > 0 && (
                    <div className="pt-3 border-t border-gray-50 flex items-center flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mr-1.5">Materials:</span>
                      {section.materials.map((mat, i) => (
                        <span key={i} className="inline-flex items-center rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                          {mat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Assessment & Homework bottom cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 mb-2">Understanding Assessment</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{output.assessment}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 mb-2">Follow-Up Homework</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{output.homework}</p>
              </div>
            </div>

            {/* Teacher Notes */}
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Teacher Notes & Common Misconceptions</h4>
              <p className="text-xs text-gray-600 italic leading-relaxed">
                "{output.teacherNotes}"
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
export default LessonPlanPage;
