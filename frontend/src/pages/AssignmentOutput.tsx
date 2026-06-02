import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { FileText, ArrowLeft, RefreshCw, AlertTriangle, Download, Sparkles, CheckCircle2 } from "lucide-react";
import { assessmentApi, api, Assessment, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { AxiosError } from "axios";

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

interface SocketProgressPayload {
  jobId: string;
  assessmentId: string;
  status: "queued" | "processing" | "generating_sections" | "formatting" | "completed" | "failed";
  progress: number;
  message?: string;
  error?: string;
}

export const AssignmentOutput: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const jobIdParam = searchParams.get("jobId");
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("Initializing...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Catch up on job status via HTTP if missed socket events
  async function fetchJobCatchUp(jobId: string) {
    try {
      const res = await assessmentApi.getJobStatus(jobId);
      if (res.data && res.data.success) {
        const job = res.data.data;
        setProgress(job.progress);
        setStatus(job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : "processing");
        if (job.errorMessage) setErrorMsg(job.errorMessage);
        
        if (job.status === "completed") {
          // Reload assessment to get generatedPaper
          loadAssessment();
        }
      }
    } catch (err) {
      console.error("Failed to fetch job catch up status", err);
    }
  }

  // Fetch assessment from DB
  async function loadAssessment() {
    if (!id) return;
    try {
      const res = await assessmentApi.get(id);
      if (res.data && res.data.success) {
        const data = res.data.data;
        setAssessment(data);
        
        // If completed in DB, set status completed
        if (data.status === "completed") {
          setStatus("completed");
          setProgress(100);
        } else if (data.status === "failed") {
          setStatus("failed");
          setErrorMsg("Generation job failed on the server.");
        } else {
          // If draft or processing but no active jobId, we check if it has a jobId saved
          setStatus("processing");
          const activeJobId = jobIdParam || data.jobId;
          if (activeJobId) {
            fetchJobCatchUp(activeJobId);
          } else {
            setStatus("failed");
            setErrorMsg("No active generation job found.");
          }
        }
      }
    } catch (err) {
      toast.error("Failed to load assessment details");
      setStatus("failed");
    }
  }

  useEffect(() => {
    loadAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Socket.io integration
  useEffect(() => {
    const activeJobId = jobIdParam || assessment?.jobId;
    if (!activeJobId || status === "completed" || status === "failed") return;

    // Connect to WebSocket server
    const socket: Socket = io(API_BASE_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Socket connected, joining room:", activeJobId);
      socket.emit("join", activeJobId);
    });

    // Listen to job status events
    socket.on("assessment:queued", (payload: SocketProgressPayload) => {
      setProgress(0);
      setStatus("queued");
      setProgressMessage("Queued in background...");
    });

    socket.on("assessment:processing", (payload: SocketProgressPayload) => {
      setProgress(10);
      setStatus("processing");
      setProgressMessage("Initiating question generation...");
    });

    socket.on("assessment:progress", (payload: SocketProgressPayload) => {
      setProgress(payload.progress);
      setStatus(payload.status);
      if (payload.message) setProgressMessage(payload.message);
    });

    socket.on("assessment:completed", (payload: SocketProgressPayload) => {
      setProgress(100);
      setStatus("completed");
      toast.success("Assignment generated successfully!");
      loadAssessment();
      socket.disconnect();
    });

    socket.on("assessment:failed", (payload: SocketProgressPayload) => {
      setStatus("failed");
      setErrorMsg(payload.error || "Generation failed");
      toast.error(payload.error || "Generation failed");
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdParam, assessment?.jobId]);

  // Download PDF handler
  const handleDownloadPdf = async () => {
    if (!id || !assessment) return;
    setDownloadingPdf(true);
    try {
      const res = await assessmentApi.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `assessment_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF download started!");
    } catch (err) {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Regenerate handler
  const handleRegenerate = async () => {
    if (!id) return;
    setStatus("processing");
    setProgress(0);
    setErrorMsg(null);
    setProgressMessage("Submitting request...");
    
    try {
      const res = await assessmentApi.regenerate(id);
      if (res.data && res.data.success) {
        const result = res.data.data;
        toast.success("Regeneration started!");
        // Update URL search parameters
        navigate(`/assignments/${id}?jobId=${result.jobId}`, { replace: true });
        loadAssessment();
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error?.message || "Regeneration request failed");
      setStatus("failed");
    }
  };

  // Difficulty badge styling
  const renderDifficultyBadge = (difficulty: "easy" | "medium" | "hard") => {
    // Mapping: easy -> Easy, medium -> Moderate, hard -> Challenging
    const map = {
      easy: { label: "[Easy]", style: "text-emerald-700 font-bold" },
      medium: { label: "[Moderate]", style: "text-amber-700 font-bold" },
      hard: { label: "[Challenging]", style: "text-red-700 font-bold" },
    };
    const badge = map[difficulty] || { label: `[${difficulty}]`, style: "text-gray-700 font-bold" };
    return <span className={cn("text-xs font-bold", badge.style)}>{badge.label}</span>;
  };

  // Status loader helper
  const renderLoadingState = () => {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-gray-100 rounded-2xl shadow-sm max-w-xl mx-auto">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-orange-500 border border-orange-100">
          <RefreshCw className="h-10 w-10 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Generating Assignment</h3>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-6">
          Status: {status.replace("_", " ")}
        </p>

        {/* Progress Bar Container */}
        <div className="w-full max-w-sm mb-4">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-500 mb-2.5">
            <span>{progressMessage}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#111111] transition-all duration-500 rounded-full" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
          Please do not close this window. AdeptAi is structuring sections, generating questions, and formatting your exam sheet.
        </p>
      </div>
    );
  };

  const renderFailedState = () => {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-gray-100 rounded-2xl shadow-sm max-w-xl mx-auto">
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 border border-red-100">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Generation Failed</h3>
        <p className="text-sm text-red-500 max-w-md mb-8">
          {errorMsg || "An unknown error occurred during assignment creation."}
        </p>

        <button
          onClick={handleRegenerate}
          className="flex items-center gap-2 rounded-full bg-black py-3 px-6 text-sm font-semibold text-white shadow-md hover:bg-gray-900 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry Generation</span>
        </button>
      </div>
    );
  };

  if (status === "loading") {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  if (status === "failed") {
    return <Layout>{renderFailedState()}</Layout>;
  }

  if (status !== "completed" || !assessment || !assessment.generatedPaper) {
    return <Layout>{renderLoadingState()}</Layout>;
  }

  const paper = assessment.generatedPaper;
  const teacherName = user?.email?.split("@")[0] || "Lakshya";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto font-sans pb-24">
        {/* Banner: Matches assignment-output.png */}
        <div className="mb-8 rounded-2xl bg-[#111111] p-6 text-white shadow-md">
          <p className="text-sm font-medium leading-relaxed mb-4">
            Certainly, {teacherName}! Here are customized Question Paper for your CBSE Grade 8 {assessment.subject} classes on the NCERT chapters:
          </p>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className={cn("h-4.5 w-4.5", downloadingPdf && "animate-spin")} />
            <span>Download as PDF</span>
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="mb-6 flex justify-between items-center px-1">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
          
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Regenerate Paper</span>
          </button>
        </div>

        {/* Paper Sheet Preview Area: Matches Figma design */}
        <div className="rounded-2xl border border-gray-200 bg-white p-12 shadow-[0_4px_30px_rgba(0,0,0,0.02)] min-h-[800px] font-serif text-gray-900">
          
          {/* Centered School Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold font-serif mb-1 uppercase tracking-wide">
              {user?.institutionName || "Delhi Public School"}{user?.branch ? `, ${user.branch}` : user?.institutionName ? "" : ", Sector-4, Bokaro"}
            </h1>
            <h2 className="text-base font-semibold font-serif mb-1">
              Subject: {paper.metadata.subject || assessment.subject}
            </h2>
            <h3 className="text-sm font-semibold font-serif">
              Class: 5th
            </h3>
          </div>

          {/* Time and Marks Bar: Matches assignment-output.png */}
          <div className="flex justify-between items-center text-xs font-serif border-b border-gray-200 pb-3 mb-4">
            <div>
              Time Allowed: {paper.metadata.duration || assessment.duration} minutes
            </div>
            <div>
              Maximum Marks: {paper.metadata.totalMarks || assessment.totalMarks}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs font-bold font-serif text-gray-800 mb-6 leading-relaxed">
            {paper.metadata.instructions || "All questions are compulsory unless stated otherwise."}
          </div>

          {/* Student Info Lines: Underlines styling */}
          <div className="flex flex-col gap-3.5 max-w-sm mb-8 text-xs font-serif">
            <div className="flex items-baseline">
              <span className="mr-2">Name:</span>
              <div className="flex-1 border-b border-gray-400 h-4"></div>
            </div>
            <div className="flex items-baseline">
              <span className="mr-2">Roll Number:</span>
              <div className="flex-1 border-b border-gray-400 h-4"></div>
            </div>
            <div className="flex items-baseline">
              <span className="mr-2">Class: 5th Section:</span>
              <div className="flex-1 border-b border-gray-400 h-4"></div>
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-8 font-serif">
            {paper.sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-4">
                {/* Section title (Section A) */}
                <div className="text-center font-bold text-sm tracking-wider my-6 uppercase">
                  {section.title}
                </div>

                {/* Section subtitle & Instructions */}
                <div className="space-y-1 mb-4">
                  <h4 className="text-xs font-bold uppercase text-gray-800">
                    {section.title.includes("Section") ? "Question Set" : section.title}
                  </h4>
                  <p className="text-xs italic text-gray-500">
                    {section.instruction}
                  </p>
                </div>

                {/* Questions List */}
                <ol className="space-y-5 list-none pl-0 text-xs leading-relaxed text-gray-800">
                  {section.questions.map((q, qIdx) => (
                    <li key={qIdx} className="flex gap-2.5 items-start">
                      <span className="min-w-[18px] text-right font-serif font-medium">{q.questionNumber || qIdx + 1}.</span>
                      <div className="flex-1">
                        <div className="flex flex-wrap sm:flex-nowrap justify-between gap-4">
                          <span className="font-serif">
                            {renderDifficultyBadge(q.difficulty)} {q.text}
                          </span>
                          <span className="text-gray-500 font-serif whitespace-nowrap">
                            [{q.marks} Marks]
                          </span>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pl-4">
                            {q.options.map((opt, oIdx) => {
                              const optionLabel = String.fromCharCode(97 + oIdx) + ")"; // a), b), c), d)
                              return (
                                <div key={oIdx} className="font-serif text-gray-700 flex gap-1">
                                  <span className="font-bold">{optionLabel}</span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          {/* End of Question Paper */}
          <div className="font-bold text-xs mt-10 pt-6 border-t border-gray-100">
            End of Question Paper
          </div>

          {/* Answer Key Section */}
          <div className="mt-12 pt-6 border-t-2 border-dashed border-gray-200">
            <div className="font-bold text-sm text-gray-900 mb-4">
              Answer Key:
            </div>
            
            <ol className="space-y-4 list-decimal pl-5 text-xs text-gray-600 leading-relaxed font-sans">
              {paper.sections.flatMap((s) => s.questions).map((q, idx) => (
                <li key={idx} className="pl-1">
                  <span className="font-semibold text-gray-800">Q{q.questionNumber || idx + 1}: </span>
                  {q.answer || "No answer key generated."}
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>
    </Layout>
  );
};
export default AssignmentOutput;
