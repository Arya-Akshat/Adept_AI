import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Sparkles,
  RefreshCw,
  Check,
  FileText,
  BookOpen,
  Copy,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { courseApi, toolkitApi, pdfApi } from "@/lib/api";
import { useLibraryStore } from "@/store/libraryStore";
import { toast } from "sonner";

interface Question {
  questionNumber: number;
  questionText: string;
  type: "mcq" | "short" | "long";
  cognitiveLevel: "remembering" | "understanding" | "applying" | "analyzing" | "evaluating" | "creating";
  options?: string[];
  correctAnswer: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
}

interface QuestionBankData {
  _id?: string;
  metadata: {
    title: string;
    subject: string;
    questionCount: number;
    generatedAt: string;
  };
  questions: Question[];
}

const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate();
  const { files, setFiles } = useLibraryStore();

  // App data state
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form selections
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [questionTypes, setQuestionTypes] = useState<("mcq" | "short" | "long")[]>(["mcq", "short"]);
  const [topicFocus, setTopicFocus] = useState<string>("");

  // Generation status
  const [generating, setGenerating] = useState(false);
  const [generatedBank, setGeneratedBank] = useState<QuestionBankData | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [courseRes, pdfRes] = await Promise.all([
          courseApi.listCourses(),
          pdfApi.listPDFs()
        ]);
        setCourses(courseRes.data || []);
        setFiles(pdfRes.data as any);

        const queryParams = new URLSearchParams(window.location.search);
        const qbId = queryParams.get("id");
        if (qbId) {
          const res = await toolkitApi.getQuestionBank(qbId);
          if (res.data && res.data.success && res.data.data) {
            setGeneratedBank(res.data.data as QuestionBankData);
            setSelectedCourseId(res.data.data.courseId || courseRes.data[0]?._id || "");
          }
        } else if (courseRes.data && courseRes.data.length > 0) {
          setSelectedCourseId(courseRes.data[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load materials and courses");
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [setFiles]);

  // Handle auto-selection of course files
  useEffect(() => {
    if (selectedCourseId) {
      const courseFiles = files.filter(f => f.courseId === selectedCourseId);
      setSelectedFileIds(courseFiles.map(f => f.id));
    } else {
      setSelectedFileIds([]);
    }
  }, [selectedCourseId, files]);

  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleToggleType = (type: "mcq" | "short" | "long") => {
    setQuestionTypes(prev =>
      prev.includes(type)
        ? prev.length > 1
          ? prev.filter(t => t !== type)
          : prev // Keep at least one type
        : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!selectedCourseId) {
      toast.error("Please select a course/subject folder first");
      return;
    }
    if (selectedFileIds.length === 0) {
      toast.error("Please select at least one material/file as context");
      return;
    }

    setGenerating(true);
    try {
      const res = await toolkitApi.generateQuestionBank({
        courseId: selectedCourseId,
        fileIds: selectedFileIds,
        questionCount,
        questionTypes,
        difficulty,
        topicFocus: topicFocus || undefined
      });

      if (res.data && res.data.success && res.data.data) {
        setGeneratedBank(res.data.data as QuestionBankData);
        toast.success("Question Bank generated successfully!");
      } else {
        toast.error("Failed to generate Question Bank");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || "Generation request failed";
      toast.error(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const toggleAnswer = (num: number) => {
    setExpandedAnswers(prev => ({
      ...prev,
      [num]: !prev[num]
    }));
  };

  const handleCopyClipboard = () => {
    if (!generatedBank) return;
    let text = `${generatedBank.metadata.title}\nSubject: ${generatedBank.metadata.subject}\nTotal Questions: ${generatedBank.metadata.questionCount}\n\n`;

    generatedBank.questions.forEach((q) => {
      text += `Question ${q.questionNumber}: [${q.type.toUpperCase()}] [${q.difficulty.toUpperCase()}] [${q.marks} Marks] [Bloom: ${q.cognitiveLevel}]\n`;
      text += `${q.questionText}\n`;
      if (q.type === "mcq" && q.options) {
        q.options.forEach((opt, idx) => {
          text += `  ${String.fromCharCode(65 + idx)}) ${opt}\n`;
        });
      }
      text += `Correct Answer / Key: ${q.correctAnswer}\n\n`;
    });

    navigator.clipboard.writeText(text);
    toast.success("Question Bank copied to clipboard!");
  };

  const handleDownloadTxt = () => {
    if (!generatedBank) return;
    let text = `${generatedBank.metadata.title}\nSubject: ${generatedBank.metadata.subject}\nTotal Questions: ${generatedBank.metadata.questionCount}\n\n`;

    generatedBank.questions.forEach((q) => {
      text += `Question ${q.questionNumber}: [${q.type.toUpperCase()}] [${q.difficulty.toUpperCase()}] [${q.marks} Marks]\n`;
      text += `${q.questionText}\n`;
      if (q.type === "mcq" && q.options) {
        q.options.forEach((opt, idx) => {
          text += `  ${String.fromCharCode(65 + idx)}) ${opt}\n`;
        });
      }
      text += `Correct Answer / Key: ${q.correctAnswer}\n\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `QuestionBank-${generatedBank.metadata.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const courseFiles = files.filter(f => f.courseId === selectedCourseId);
  const selectedCourse = courses.find(c => c._id === selectedCourseId);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-20 font-sans">
        {/* Header toolbar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => navigate("/toolkit")}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Toolkit</span>
            </button>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 mt-2">
              AI Question Bank Generator
            </h1>
          </div>

          {generatedBank && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyClipboard}
                className="text-xs font-bold rounded-xl border-gray-200"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTxt}
                className="text-xs font-bold rounded-xl border-gray-200"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download Text
              </Button>
              <Button
                size="sm"
                onClick={() => setGeneratedBank(null)}
                className="text-xs font-bold rounded-xl bg-black text-white hover:bg-gray-900"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Generate New
              </Button>
            </div>
          )}
        </div>

        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mb-4"></div>
            <p className="text-sm text-gray-500 font-medium">Loading courses and uploaded materials...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT INPUT COLUMN (Shown if generating/configuring) */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-gray-100 rounded-2xl shadow-sm bg-white">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-gray-900">1. Select Course Folder</h3>
                    <div className="space-y-2">
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      >
                        <option value="" disabled>Choose a folder...</option>
                        {courses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedCourseId && (
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                      <h3 className="font-bold text-sm text-gray-900">2. Select Reference Materials</h3>
                      {courseFiles.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No files in this folder. Upload PDFs on the Library tab.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {courseFiles.map((file) => (
                            <div
                              key={file.id}
                              onClick={() => handleToggleFile(file.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                selectedFileIds.includes(file.id)
                                  ? "border-orange-500 bg-orange-50/20"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                                selectedFileIds.includes(file.id)
                                  ? "bg-orange-500 border-orange-500 text-white"
                                  : "border-gray-300 bg-white"
                              }`}>
                                {selectedFileIds.includes(file.id) && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-700 truncate">{file.originalName}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="font-bold text-sm text-gray-900">3. Question Count & Difficulty</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <Label className="text-xs font-bold text-gray-700">Number of Questions</Label>
                          <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{questionCount} Questions</span>
                        </div>
                        <input
                          type="range"
                          min={3}
                          max={25}
                          value={questionCount}
                          onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-gray-700 block mb-1.5">Difficulty Level</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {(["easy", "medium", "hard", "mixed"] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setDifficulty(level)}
                              className={`py-2 text-[10px] uppercase font-extrabold rounded-lg border text-center transition-all ${
                                difficulty === level
                                  ? "bg-black border-black text-white"
                                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="font-bold text-sm text-gray-900">4. Question Formats</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(["mcq", "short", "long"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleToggleType(type)}
                          className={`py-2.5 text-xs font-bold rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                            questionTypes.includes(type)
                              ? "bg-orange-500 border-orange-500 text-white"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <span className="uppercase text-[10px]">
                            {type === "mcq" ? "MCQs" : type === "short" ? "Short Ans" : "Long Ans"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="font-bold text-sm text-gray-900">5. Custom Focus & Keywords (Optional)</h3>
                    <textarea
                      value={topicFocus}
                      onChange={(e) => setTopicFocus(e.target.value)}
                      placeholder="e.g. Focus on Newtonian physics equations, exclude quantum theory, include analytical questions..."
                      rows={3}
                      className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !selectedCourseId || selectedFileIds.length === 0}
                    className="w-full rounded-full py-4 text-xs font-bold tracking-wide uppercase shadow-sm bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 transition-all"
                  >
                    {generating ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                        Generating Question Bank...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        Generate Question Bank
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT DISPLAY WORKSPACE */}
            <div className="lg:col-span-8">
              {generating ? (
                <Card className="border-gray-100 rounded-2xl bg-white shadow-sm p-12 text-center h-[580px] flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-extrabold text-white font-serif animate-pulse">A</span>
                    </div>
                    <div className="absolute -inset-2 rounded-full border-2 border-orange-300 border-t-transparent animate-spin" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h3 className="text-lg font-bold text-gray-900">Compiling Question Bank...</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      AdeptAi is reading your selected course files, outlining cognitive difficulty levels, and structuring marking keys.
                    </p>
                  </div>
                </Card>
              ) : generatedBank ? (
                /* Generated Output View */
                <div className="space-y-6">
                  <Card className="border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 md:p-8">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="bg-orange-500 text-white text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full">
                          AI Question Bank
                        </span>
                        {selectedCourse && (
                          <span className="bg-white/10 text-white text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full">
                            Folder: {selectedCourse.name}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-2">
                        {generatedBank.metadata.title}
                      </h2>
                      <div className="flex justify-between items-center text-xs text-gray-400 mt-4 border-t border-white/10 pt-4">
                        <div>Subject: {generatedBank.metadata.subject}</div>
                        <div>Total: {generatedBank.metadata.questionCount} Questions</div>
                      </div>
                    </div>

                    <CardContent className="p-6 md:p-8 space-y-8">
                      {generatedBank.questions.map((q) => (
                        <div key={q.questionNumber} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="h-6 w-6 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">
                                {q.questionNumber}
                              </span>
                              <span className="text-[10px] font-extrabold tracking-wider uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                {q.type}
                              </span>
                              <span className="text-[10px] font-extrabold tracking-wider uppercase text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                {q.cognitiveLevel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                              <span className="bg-gray-50 border border-gray-150 rounded px-1.5 py-0.5 capitalize text-[10px] text-gray-500">{q.difficulty}</span>
                              <span className="bg-gray-900 text-white rounded px-1.5 py-0.5 text-[10px]">{q.marks} Mark{q.marks > 1 ? "s" : ""}</span>
                            </div>
                          </div>

                          <p className="text-sm font-semibold text-gray-800 leading-relaxed pl-8">
                            {q.questionText}
                          </p>

                          {q.type === "mcq" && q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8 mt-2">
                              {q.options.map((opt, oIdx) => {
                                const optionLetter = String.fromCharCode(65 + oIdx);
                                return (
                                  <div
                                    key={oIdx}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium transition-all ${
                                      q.correctAnswer === optionLetter || q.correctAnswer.startsWith(optionLetter)
                                        ? "border-green-200 bg-green-50/20 text-green-900"
                                        : "border-gray-200 bg-white text-gray-700"
                                    }`}
                                  >
                                    <span className={`h-5 w-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                      q.correctAnswer === optionLetter || q.correctAnswer.startsWith(optionLetter)
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-100 text-gray-500"
                                    }`}>
                                      {optionLetter}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="pl-8 pt-2">
                            <button
                              onClick={() => toggleAnswer(q.questionNumber)}
                              className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-black transition-colors"
                            >
                              <span>{expandedAnswers[q.questionNumber] ? "Hide Answer Key" : "Reveal Answer Key"}</span>
                              {expandedAnswers[q.questionNumber] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>

                            {expandedAnswers[q.questionNumber] && (
                              <div className="mt-2.5 p-4 rounded-xl bg-orange-50/30 border border-orange-100 text-xs text-orange-950 leading-relaxed font-mono">
                                <div className="font-bold text-orange-800 uppercase tracking-wider text-[9px] mb-1">Correct Answer / Guideline:</div>
                                <div>{q.correctAnswer}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Empty state panel */
                <Card className="border-gray-100 border-dashed rounded-2xl bg-gray-50/40 p-12 text-center h-[580px] flex flex-col items-center justify-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-2">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-sm font-bold text-gray-900">No Question Bank Compiled</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Select a course subject folder, pick study materials, choose question formats, and click generate.
                    </p>
                  </div>
                </Card>
              )}
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
};

export default QuestionBankPage;
