import { ArrowLeft, BookOpen, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface TopicHeaderProps {
  topic: {
    title: string;
  };
  unitIndex: number;
  topicIndex?: number;
  totalTopics?: number;
  onBack: () => void;
  studied?: boolean;
  onToggleStudied?: () => void;
  studiedProgress?: number; // Real percentage of studied topics in the unit!
}

export const TopicHeader = ({ 
  topic, 
  unitIndex, 
  topicIndex, 
  totalTopics, 
  onBack,
  studied = false,
  onToggleStudied,
  studiedProgress = 0
}: TopicHeaderProps) => {
  const currentTopic = topicIndex !== undefined ? topicIndex + 1 : 1;
  const total = totalTopics || 1;

  return (
    <div className="space-y-4">
      {/* Back button and Toggle Studied Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="group gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white text-gray-500 -ml-2 rounded-xl transition-all"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Roadmap
        </Button>

        {onToggleStudied && (
          <Button
            onClick={onToggleStudied}
            className={`gap-2 rounded-xl text-xs font-semibold px-4 py-2 transition-all shadow-sm ${
              studied
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
            }`}
          >
            <CheckCircle className={`h-4 w-4 ${studied ? "fill-white text-green-600" : ""}`} />
            {studied ? "Studied ✓" : "Mark as Studied"}
          </Button>
        )}
      </div>

      {/* Breadcrumb */}
      <Breadcrumb className="text-xs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <span className="text-gray-400">Library</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-gray-400">Unit {unitIndex + 1}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-orange-600">{topic.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Title Section */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 md:p-8 text-white shadow-sm relative overflow-hidden">
        {/* Decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-orange-400 uppercase mb-2">
              <BookOpen className="h-3.5 w-3.5" />
              Unit {unitIndex + 1} · Topic {currentTopic} of {total}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {topic.title}
            </h1>
          </div>

          <div className="shrink-0 w-full md:w-48">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
              <span>Unit Progress</span>
              <span>{Math.round(studiedProgress)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${studiedProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
