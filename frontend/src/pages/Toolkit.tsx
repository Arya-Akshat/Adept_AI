import React from "react";
import { Layout } from "@/components/Layout";
import { 
  ImageIcon, 
  FileText, 
  ChevronRight, 
  BookOpen, 
  Award, 
  BarChart3, 
  Presentation 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Toolkit: React.FC = () => {
  const navigate = useNavigate();

  const toolkitLinks = [
    {
      title: "Syllabus Extractor",
      desc: "Upload a syllabus photo/scan to parse topics and add them to your study roadmap assets.",
      icon: <ImageIcon className="h-5 w-5" />,
      badge: "Syllabus Upload",
      path: "/syllabus",
      comingSoon: false,
    },
    {
      title: "Study Notes Uploader",
      desc: "Upload lecture notes and PDF study materials to generate roadmaps directly.",
      icon: <FileText className="h-5 w-5" />,
      badge: "Upload Notes",
      path: "/input-notes",
      comingSoon: false,
    },
    {
      title: "Lesson Plan Generator",
      desc: "Create comprehensive lesson plans with timing breakdowns, teacher/student actions, objectives, and assessment strategies.",
      icon: <BookOpen className="h-5 w-5" />,
      badge: "Lesson Plan",
      path: "/toolkit/lesson-plan",
      comingSoon: false,
    },
    {
      title: "Instant Rubric Designer",
      desc: "Input your assignment details and learning goals to receive a customized, multi-criteria evaluation rubric.",
      icon: <Award className="h-5 w-5" />,
      badge: "Rubric Designer",
      path: "/toolkit/rubric",
      comingSoon: false,
    },
    {
      title: "AI Question Bank Generator",
      desc: "Generate custom banks of MCQs, short answers, and essay prompts categorized by cognitive complexity.",
      icon: <BookOpen className="h-5 w-5" />,
      badge: "Question Bank",
      path: "/toolkit/question-bank",
      comingSoon: false,
    },
    {
      title: "Classroom Analytics Insight",
      desc: "Visualize student performance patterns and conceptual gaps using automatic grading logs.",
      icon: <BarChart3 className="h-5 w-5" />,
      badge: "Coming Soon",
      comingSoon: true,
    },
    {
      title: "AI Lecture Slide Creator",
      desc: "Upload textbook chapters or notes to structure and export engaging presentation slides.",
      icon: <Presentation className="h-5 w-5" />,
      badge: "Slide Creator",
      path: "/toolkit/slide-generator",
      comingSoon: false,
    },
  ];

  const handleToolClick = (tool: typeof toolkitLinks[number]) => {
    if (tool.comingSoon) {
      toast.info(`${tool.title} is coming soon!`, {
        description: "We are actively developing this feature to enhance your teaching experience.",
      });
      return;
    }
    if (tool.path) {
      navigate(tool.path);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">AI Teacher's Toolkit</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Access syllabus extraction, study roadmap pipelines, and preview upcoming AI tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
        {toolkitLinks.map((tool) => (
          <button
            key={tool.title}
            onClick={() => handleToolClick(tool)}
            className={`flex flex-col justify-between rounded-2xl border p-6 text-left shadow-sm transition-all group ${
              tool.comingSoon
                ? "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-70 cursor-not-allowed"
                : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md dark:hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-900 cursor-pointer"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                    tool.comingSoon
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                      : "bg-orange-50 dark:bg-orange-950/20 text-orange-500 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white"
                  }`}
                >
                  {tool.icon}
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    tool.comingSoon
                      ? "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      : "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
                  }`}
                >
                  {tool.badge}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">{tool.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tool.desc}</p>
            </div>
            <div
              className={`mt-5 flex items-center gap-1 text-xs font-semibold ${
                tool.comingSoon
                  ? "text-gray-400 dark:text-gray-550"
                  : "text-orange-500 dark:text-orange-400 group-hover:gap-2 transition-all"
              }`}
            >
              {tool.comingSoon ? "Coming Soon" : "Go to Page"}
              {!tool.comingSoon && <ChevronRight className="h-3.5 w-3.5" />}
            </div>
          </button>
        ))}
      </div>
    </Layout>
  );
};

export default Toolkit;
