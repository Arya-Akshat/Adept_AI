import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { TopicHeader } from "@/components/topic/TopicHeader";
import { LearningObjectivesCard } from "@/components/topic/LearningObjectivesCard";
import { DetailedExplanationCard } from "@/components/topic/DetailedExplanationCard";
import { KeyConceptsCard } from "@/components/topic/KeyConceptsCard";
import { PracticalExamplesCard } from "@/components/topic/PracticalExamplesCard";
import { YouTubeVideosCard } from "@/components/topic/YouTubeVideosCard";
import { pdfApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TopicDetail {
  title: string;
  unit: number;
  learningObjectives: string[];
  detailedExplanation: string;
  keyConcepts: string[];
  practicalExamples: string[];
  youtubeVideos: {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    duration: string;
    viewCount: string;
  }[];
}

const LOADING_STEPS = [
  "Reading your study material…",
  "Extracting key concepts…",
  "Building detailed explanation…",
  "Finding practical examples…",
  "Fetching YouTube resources…",
  "Putting it all together…",
];

const TopicDetail = () => {
  const { pdfId, unitIndex, topicIndex } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const { topicTitle, topicSummary, restorePdfId, restoreUnitIndex, roadmapUnits } =
    location.state || {};

  const [roadmapUnitsState, setRoadmapUnitsState] = useState<any>(roadmapUnits || null);
  const [studied, setStudied] = useState(false);

  // Fetch roadmap units if not passed in routing state
  useEffect(() => {
    const fetchRoadmap = async () => {
      if (!roadmapUnitsState && pdfId) {
        try {
          const res = await pdfApi.getRoadmapForPDF(pdfId);
          setRoadmapUnitsState(res.data.roadmap);
        } catch (e) {
          console.error("Failed to load roadmap units for progress calculations", e);
        }
      }
    };
    fetchRoadmap();
  }, [pdfId, roadmapUnitsState]);

  // Set local studied status when roadmap data or topic parameters change
  useEffect(() => {
    if (roadmapUnitsState && unitIndex !== undefined && topicIndex !== undefined) {
      const topicObj = roadmapUnitsState[unitIndex]?.[topicIndex];
      setStudied(!!topicObj?.studied);
    }
  }, [roadmapUnitsState, unitIndex, topicIndex]);

  // Toggle studied handler
  const handleToggleStudied = async () => {
    if (!pdfId || unitIndex === undefined || topicIndex === undefined) return;
    const newStudied = !studied;
    try {
      await pdfApi.toggleTopicStudied(
        pdfId,
        parseInt(unitIndex, 10),
        parseInt(topicIndex, 10),
        newStudied
      );

      // Update local state instantly
      const updated = { ...roadmapUnitsState };
      if (updated[unitIndex]) {
        if (!updated[unitIndex][topicIndex]) {
          updated[unitIndex][topicIndex] = {};
        }
        updated[unitIndex][topicIndex].studied = newStudied;
      }
      setRoadmapUnitsState(updated);
      setStudied(newStudied);
      
      toast({
        title: newStudied ? "✓ Marked as Studied" : "Marked as Unstudied",
        description: newStudied
          ? "This topic's progress has been saved."
          : "This topic is marked as incomplete.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update studied status.",
        variant: "destructive",
      });
    }
  };

  // Build prev/next topic navigation
  const currentUnitTopics = roadmapUnitsState && unitIndex !== undefined
    ? Object.keys(roadmapUnitsState[unitIndex] || {})
    : [];
  const currentTopicIdx = currentUnitTopics.indexOf(topicIndex || "");
  const prevTopicId = currentTopicIdx > 0 ? currentUnitTopics[currentTopicIdx - 1] : null;
  const nextTopicId =
    currentTopicIdx >= 0 && currentTopicIdx < currentUnitTopics.length - 1
      ? currentUnitTopics[currentTopicIdx + 1]
      : null;

  const navigateToTopic = (tid: string) => {
    const topic = roadmapUnitsState?.[unitIndex || "0"]?.[tid];
    navigate(`/library/${pdfId}/topic/${unitIndex}/${tid}`, {
      state: {
        topicTitle: topic?.title,
        topicSummary: topic?.summary,
        restorePdfId: restorePdfId || pdfId,
        restoreUnitIndex: restoreUnitIndex || unitIndex,
        roadmapUnits: roadmapUnitsState,
      },
    });
  };

  const handleBack = () => {
    sessionStorage.setItem("roadmap_restore_pdfId", restorePdfId || pdfId || "");
    sessionStorage.setItem("roadmap_restore_unit", restoreUnitIndex || unitIndex || "0");
    navigate("/library");
  };

  // Scroll to top of page on topic navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [unitIndex, topicIndex]);

  useEffect(() => {
    const fetchExplanation = async () => {
      let title = topicTitle;
      let summary = topicSummary;

      if (!title && pdfId) {
        try {
          const res = await pdfApi.getRoadmapForPDF(pdfId);
          const roadmap = res.data.roadmap;
          const unit = roadmap[unitIndex || "0"];
          const topic = unit?.topics?.[topicIndex || "0"];
          if (topic) { title = topic.title; summary = topic.summary; }
        } catch (e) {
          console.error("Failed to fetch roadmap for context", e);
        }
      }

      if (!pdfId || !title) { setLoading(false); return; }

      try {
        const response = await pdfApi.explainTopic(
          pdfId,
          parseInt(unitIndex || "0"),
          parseInt(topicIndex || "0"),
          { topicTitle: title, topicSummary: summary }
        );
        const data = response.data;
        const explanation = data.explanation;
        const hasContent =
          explanation &&
          (explanation.detailedExplanation ||
            explanation.learningObjectives?.length ||
            explanation.keyConcepts?.length);

        if (!hasContent) {
          setFailed(true);
          toast({ title: "Generation failed", description: "The AI couldn't produce content. Please retry.", variant: "destructive" });
          return;
        }

        setTopicDetail({
          title,
          unit: parseInt(unitIndex || "0"),
          learningObjectives: explanation.learningObjectives,
          detailedExplanation: explanation.detailedExplanation,
          keyConcepts: explanation.keyConcepts,
          practicalExamples: explanation.practicalExamples,
          youtubeVideos: data.youtubeVideos,
        });
      } catch (error: any) {
        console.error(error);
        setFailed(true);
        toast({ title: "Error", description: error?.response?.data?.error || "Failed to generate topic explanation", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [pdfId, unitIndex, topicIndex, topicTitle, topicSummary, retryCount]);

  // Step animation
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStepIndex((i) => (i < LOADING_STEPS.length - 1 ? i + 1 : i));
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
          <div className="relative mb-10">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 opacity-20 blur-2xl absolute inset-0 animate-pulse" />
            <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
              <span className="text-4xl font-extrabold text-white font-serif">A</span>
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-orange-300 border-t-transparent animate-spin" />
          </div>
          {topicTitle && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-semibold text-orange-700 truncate max-w-xs">{topicTitle}</span>
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-4">AdeptAi is preparing your material</h2>
          <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-10">
            Hang tight — we're generating a personalised explanation with key concepts, examples and curated videos.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {LOADING_STEPS.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-500 ${
                  i === stepIndex
                    ? "bg-[#111111] dark:bg-zinc-50 text-white dark:text-zinc-950 shadow-md scale-[1.02]"
                    : i < stepIndex
                    ? "bg-gray-100 text-gray-400 line-through"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${i === stepIndex ? "bg-orange-400 animate-pulse" : i < stepIndex ? "bg-gray-300" : "bg-gray-200"}`} />
                {step}
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (failed) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border border-red-100">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Generation Failed</h2>
          <p className="text-sm text-gray-500 max-w-sm mb-8">
            The AI couldn't generate content for <span className="font-semibold text-gray-700">{topicTitle || "this topic"}</span>. Try again.
          </p>
          <button
            onClick={() => { setFailed(false); setLoading(true); setStepIndex(0); setRetryCount(c => c + 1); }}
            className="rounded-full bg-black text-white text-sm font-semibold px-6 py-3 hover:bg-gray-900 transition-all shadow-md"
          >
            🔄 Retry Generation
          </button>
          <button onClick={handleBack} className="mt-4 text-xs text-gray-400 hover:text-gray-700 underline">
            Go back to roadmap
          </button>
        </div>
      </Layout>
    );
  }

  if (!topicDetail) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Topic Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">Could not load topic details.</p>
          <button onClick={handleBack} className="rounded-full bg-black text-white text-sm font-semibold px-5 py-2.5 hover:bg-gray-900 transition-all">
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  const unitNum = parseInt(unitIndex || "0");
  const topicNum = parseInt(topicIndex || "0");
  const totalTopicsInUnit = currentUnitTopics.length;

  const unitTopicsValues = roadmapUnitsState && unitIndex !== undefined
    ? Object.values(roadmapUnitsState[unitIndex] || {})
    : [];
  const totalInUnit = unitTopicsValues.length || 1;
  const studiedInUnit = unitTopicsValues.filter((t: any) => t.studied).length;
  const studiedProgress = (studiedInUnit / totalInUnit) * 100;

  return (
    <Layout>
      <div className="mt-4 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <TopicHeader
            topic={topicDetail}
            unitIndex={unitNum}
            topicIndex={topicNum}
            totalTopics={totalTopicsInUnit}
            onBack={handleBack}
            studied={studied}
            onToggleStudied={handleToggleStudied}
            studiedProgress={studiedProgress}
          />

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Main Content Column */}
            <div className="lg:col-span-8 space-y-8">
              <DetailedExplanationCard explanation={topicDetail.detailedExplanation} />
              <PracticalExamplesCard examples={topicDetail.practicalExamples} />
            </div>

            {/* Right Sidebar Column */}
            <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-6">
              <LearningObjectivesCard objectives={topicDetail.learningObjectives} />
              <KeyConceptsCard concepts={topicDetail.keyConcepts} />
            </div>
          </div>

          {/* YouTube videos — full width at the bottom */}
          {topicDetail.youtubeVideos?.length > 0 && (
            <div className="mt-12">
              <YouTubeVideosCard videos={topicDetail.youtubeVideos} />
            </div>
          )}

          {/* Prev / Next navigation */}
          <div className="mt-12 flex items-center justify-between gap-4">
            {prevTopicId ? (
              <button
                onClick={() => navigateToTopic(prevTopicId)}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Topic
              </button>
            ) : (
              <div />
            )}
            {nextTopicId ? (
              <button
                onClick={() => navigateToTopic(nextTopicId)}
                className="flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 transition-all shadow-sm"
              >
                Next Topic
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TopicDetail;
