import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Presentation, 
  ArrowLeft, 
  Download, 
  Sparkles, 
  RefreshCw, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  ImageIcon,
  BookOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { courseApi, toolkitApi, pdfApi } from "@/lib/api";
import { useLibraryStore } from "@/store/libraryStore";
import { toast } from "sonner";

interface GeneratedSlide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  teacherNotes?: string;
  suggestedImagePrompt: string;
}

interface PresentationData {
  metadata: {
    title: string;
    subject: string;
    slideCount: number;
    generatedAt: string;
  };
  slides: GeneratedSlide[];
}

const SlideGeneratorPage: React.FC = () => {
  const navigate = useNavigate();
  const { files, setFiles } = useLibraryStore();
  
  // App state
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Selection/Generation state
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [slideCount, setSlideCount] = useState<number>(8);
  const [topicFocus, setTopicFocus] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  
  // Output state
  const [generatedPresentation, setGeneratedPresentation] = useState<PresentationData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [downloading, setDownloading] = useState(false);

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
        const presId = queryParams.get("id");
        if (presId) {
          const res = await toolkitApi.getPresentation(presId);
          if (res.data && res.data.success && res.data.data) {
            setGeneratedPresentation(res.data.data as PresentationData);
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

  // Update selected file ids when course changes
  useEffect(() => {
    if (selectedCourseId) {
      const courseFiles = files.filter(f => f.courseId === selectedCourseId);
      // Auto-check all files in the course initially
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
    setGenerationStep("Analyzing selected files roadmap details...");
    
    try {
      // Step simulation for better UX
      const steps = [
        "Synthesizing materials roadmap concepts...",
        "Drafting slides layout structure...",
        "Writing core presentation body text...",
        "Formulating teacher speaker notes...",
        "Finalizing presentation slide deck..."
      ];
      
      let currentStepIdx = 0;
      const interval = setInterval(() => {
        if (currentStepIdx < steps.length) {
          setGenerationStep(steps[currentStepIdx]);
          currentStepIdx++;
        }
      }, 2500);
      
      const response = await toolkitApi.generatePresentation({
        courseId: selectedCourseId,
        fileIds: selectedFileIds,
        slideCount,
        topicFocus: topicFocus.trim() || undefined
      });
      
      clearInterval(interval);
      
      if (response.data && response.data.success && response.data.data) {
        setGeneratedPresentation(response.data.data as PresentationData);
        setCurrentSlideIndex(0);
        toast.success("Presentation generated successfully!");
      } else {
        toast.error("Slide outline structure is invalid");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || "Failed to generate presentation slides");
    } finally {
      setGenerating(false);
      setGenerationStep("");
    }
  };

  const handleDownloadPptx = async () => {
    if (!generatedPresentation) return;
    setDownloading(true);
    try {
      const response = await toolkitApi.downloadPresentationPptx({
        metadata: generatedPresentation.metadata,
        slides: generatedPresentation.slides
      });
      
      const blob = new Blob([response.data], { 
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${generatedPresentation.metadata.title.replace(/\s+/g, "_")}.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("PowerPoint slide deck downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile PPTX file");
    } finally {
      setDownloading(false);
    }
  };

  // Pre-filter files matching selected course
  const courseFiles = files.filter(f => f.courseId === selectedCourseId);

  // Theme color styles helper for previews
  const currentCourse = courses.find(c => c._id === selectedCourseId);
  const courseColor = currentCourse?.color || "#ea580c";

  return (
    <Layout>
      <div className="mb-6 mt-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/toolkit")} 
          className="mb-4 text-xs font-bold rounded-xl text-gray-500 hover:text-black px-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Toolkit
        </Button>

        <div className="flex items-center gap-2 mb-2">
          <Presentation className="h-6 w-6 text-[#EA580C]" />
          <h1 className="text-3xl font-bold">AI Slide Generator</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Generate editable PowerPoint presentation slide decks compiled using your course folder study materials.
        </p>
      </div>

      {loadingData ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
        </div>
      ) : generatedPresentation ? (
        /* Presentation Previewer View */
        <div className="space-y-6 pb-20 animate-fade-in-scale">
          {/* Top Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 border border-gray-100 p-5 rounded-2xl">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{generatedPresentation.metadata.title}</h2>
              <p className="text-xs text-gray-400 mt-1">
                Subject: {generatedPresentation.metadata.subject} · {generatedPresentation.metadata.slideCount} Slides
              </p>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setGeneratedPresentation(null)}
                className="rounded-xl border-gray-200 font-semibold text-xs py-5"
              >
                Create New presentation
              </Button>
              
              <Button
                onClick={handleDownloadPptx}
                disabled={downloading}
                className="rounded-xl bg-[#EA580C] text-white hover:bg-[#D97706] font-semibold text-xs py-5"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Compiling PPTX...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" /> Download Editable PPTX
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Slide Deck Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Slide Navigation Pane */}
            <div className="lg:col-span-1 border border-gray-100 bg-white p-4 rounded-2xl h-[500px] overflow-y-auto space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Slide Thumbnails</h3>
              {generatedPresentation.slides.map((slide, idx) => {
                const isTitleSlide = slide.slideNumber === 1;
                const isSelected = idx === currentSlideIndex;
                
                return (
                  <button
                    key={slide.slideNumber}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden flex items-start gap-3 ${
                      isSelected 
                        ? "border-[#EA580C] bg-orange-50/20 ring-1 ring-[#EA580C]/30" 
                        : "border-gray-100 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-gray-400 shrink-0 w-4">{slide.slideNumber}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{slide.title}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {isTitleSlide ? "Title Slide" : `${slide.bulletPoints.length} Points`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Slide Large Previewer Pane */}
            <div className="lg:col-span-3 space-y-6">
              {/* Widescreen 16:9 Simulator */}
              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-sm relative border border-gray-100">
                {generatedPresentation.slides[currentSlideIndex].slideNumber === 1 ? (
                  /* Title Slide (Dark slate theme) */
                  <div className="absolute inset-0 bg-[#0F172A] text-white p-12 flex flex-col justify-between select-none">
                    <div className="flex justify-between items-center text-xs tracking-wider text-slate-400 uppercase font-semibold">
                      <span>AdeptAi Slide Generator</span>
                      <span>Slide {generatedPresentation.slides[currentSlideIndex].slideNumber}</span>
                    </div>
                    
                    <div className="text-center my-auto space-y-4">
                      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight max-w-2xl mx-auto font-serif">
                        {generatedPresentation.slides[currentSlideIndex].title}
                      </h2>
                      <div className="h-1 w-24 bg-[#EA580C] mx-auto rounded-full" />
                      <p className="text-sm text-slate-400 font-medium">
                        Presented by AdeptAi · Course Subject: {generatedPresentation.metadata.subject}
                      </p>
                    </div>
                    
                    <div className="text-[10px] text-slate-500 text-center font-medium">
                      Generated on {new Date(generatedPresentation.metadata.generatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  /* Content Slide (Off-white headers with orange brand border) */
                  <div className="absolute inset-0 bg-[#FCFCFA] text-slate-800 p-8 sm:p-12 flex flex-col justify-between select-none">
                    {/* Top orange brand border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: courseColor }} />
                    
                    <div className="flex justify-between items-center text-[10px] sm:text-xs tracking-wider text-gray-400 uppercase font-semibold">
                      <span className="truncate max-w-xs">{generatedPresentation.metadata.title}</span>
                      <span>Slide {generatedPresentation.slides[currentSlideIndex].slideNumber}</span>
                    </div>

                    <div className="my-auto space-y-6">
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 border-b border-gray-100 pb-3 font-serif">
                        {generatedPresentation.slides[currentSlideIndex].title}
                      </h2>
                      
                      <ul className="space-y-3 sm:space-y-4">
                        {generatedPresentation.slides[currentSlideIndex].bulletPoints.map((point, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2.5">
                            <span className="h-2 w-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: courseColor }} />
                            <span className="text-sm sm:text-base text-gray-700 leading-relaxed font-medium">
                              {point}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="text-[10px] text-gray-400 flex items-center justify-between border-t border-gray-50 pt-3">
                      <span>Image Prompt suggestion: <span className="italic truncate max-w-md inline-block align-bottom">{generatedPresentation.slides[currentSlideIndex].suggestedImagePrompt}</span></span>
                      <span className="font-semibold text-gray-500 font-mono">AdeptAi</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Slide Navigation Controls */}
              <div className="flex items-center justify-between px-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                  className="rounded-xl border-gray-200 text-gray-700 text-xs font-semibold"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous Slide
                </Button>
                
                <span className="text-xs font-bold text-gray-500">
                  {currentSlideIndex + 1} of {generatedPresentation.slides.length}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSlideIndex === generatedPresentation.slides.length - 1}
                  onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                  className="rounded-xl border-gray-200 text-gray-700 text-xs font-semibold"
                >
                  Next Slide <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              {/* Speaker Notes */}
              {generatedPresentation.slides[currentSlideIndex].teacherNotes && (
                <div className="bg-amber-50/40 border border-amber-100/50 p-5 rounded-2xl">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-amber-700" /> Teacher's Speaker Notes
                  </h4>
                  <p className="text-sm text-amber-900 leading-relaxed font-medium">
                    {generatedPresentation.slides[currentSlideIndex].teacherNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Slide deck Generation Setup Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 animate-fade-in-scale">
          {/* Form Settings Pane */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Setup Presenter</h2>
              
              <div className="space-y-2">
                <Label htmlFor="subject-select" className="text-xs font-bold uppercase tracking-wider text-gray-400">Select Subject Course</Label>
                {courses.length === 0 ? (
                  <div className="text-sm text-gray-500 border border-dashed border-gray-100 p-4 rounded-xl text-center">
                    No Course folders found. Create a folder in My Library first.
                  </div>
                ) : (
                  <select
                    id="subject-select"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>{course.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slide-count" className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Slides Count</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    id="slide-count"
                    min="5"
                    max="15"
                    value={slideCount}
                    onChange={(e) => setSlideCount(parseInt(e.target.value))}
                    className="flex-1 accent-[#EA580C] h-1 bg-gray-100 rounded-lg cursor-pointer"
                  />
                  <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg shrink-0">{slideCount} Slides</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic-focus" className="text-xs font-bold uppercase tracking-wider text-gray-400">Focus Topic / Keyword (Optional)</Label>
                <Input
                  id="topic-focus"
                  placeholder="e.g. Focus on memory hierarchy and caches"
                  value={topicFocus}
                  onChange={(e) => setTopicFocus(e.target.value)}
                  className="rounded-xl border-gray-200"
                  disabled={generating}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedCourseId || selectedFileIds.length === 0}
                className="w-full py-6 rounded-xl bg-[#EA580C] hover:bg-[#D97706] text-white text-xs font-bold"
              >
                {generating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Compiling Presentation...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Generate Slide Outline
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Files Checker Grid (Context source files list) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm min-h-[400px]">
              <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Select Slide Context</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Check materials folder to synthesize slide texts</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C] bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                  {selectedFileIds.length} Checked
                </span>
              </div>

              {generating ? (
                /* Loading progress status */
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-pulse">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-[#EA580C] flex items-center justify-center shadow-lg">
                      <Presentation className="text-white h-7 w-7" />
                    </div>
                    <div className="absolute -inset-2 rounded-full border-2 border-orange-300 border-t-transparent animate-spin" />
                  </div>
                  <h3 className="font-bold text-gray-900">Groq is Structuring Presentation...</h3>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    {generationStep || "Loading materials Context data..."}
                  </p>
                </div>
              ) : !selectedCourseId ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                  <FileText className="h-12 w-12 text-gray-200 mb-3" />
                  <p className="text-sm font-bold">Select a Course subject to inspect source files</p>
                </div>
              ) : courseFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-900">No materials inside this Course subject folder</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">Upload notes inside "My Library" or assign files to this course folder to generate slides.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/library")}
                    className="mt-4 rounded-xl border-gray-200 text-xs font-semibold"
                  >
                    Go to My Library
                  </Button>
                </div>
              ) : (
                /* Grid of files to check */
                <div className="grid gap-4 sm:grid-cols-2">
                  {courseFiles.map((file) => {
                    const isChecked = selectedFileIds.includes(file.id);
                    const isPdf = !file.isSyllabus;
                    
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleToggleFile(file.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          isChecked 
                            ? "border-orange-500 bg-orange-50/5 shadow-sm" 
                            : "border-gray-100 bg-white hover:border-gray-200"
                        }`}
                      >
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                          isChecked 
                            ? "border-orange-500 bg-orange-500 text-white" 
                            : "border-gray-300 bg-white"
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            {isPdf ? (
                              <FileText className="h-3.5 w-3.5 text-[#EA580C]" />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                            )}
                            <span className="text-[10px] text-gray-400 font-semibold">{isPdf ? "PDF Note" : "Syllabus Image"}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-900 truncate leading-snug">
                            {file.originalName}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Status: <span className="font-semibold capitalize text-green-600">{file.roadmapStatus}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SlideGeneratorPage;
