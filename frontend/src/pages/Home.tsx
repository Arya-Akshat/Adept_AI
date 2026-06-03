import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Plus,
  BookOpen,
  FolderOpen,
  FileText,
  Users,
  Wrench,
  ChevronRight,
  Calendar,
  GraduationCap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { assessmentApi, courseApi, pdfApi, Assessment } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PDF } from "@/types";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [coursesCount, setCoursesCount] = useState(0);
  const [pdfsCount, setPdfsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch recent assessments (limit to 3 for the home page preview)
        const assResponse = await assessmentApi.list(1, 3);
        if (assResponse.data && assResponse.data.success) {
          setAssessments(assResponse.data.data.assessments);
        }

        // Fetch courses list to count folders
        const coursesResponse = await courseApi.listCourses();
        if (coursesResponse.data) {
          setCoursesCount(coursesResponse.data.length);
        }

        // Fetch study materials PDFs list to count
        const pdfsResponse = await pdfApi.listPDFs();
        if (pdfsResponse.data) {
          setPdfsCount(pdfsResponse.data.length);
        }
      } catch (error) {
        console.error("Error loading dashboard metrics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formattedName = user?.fullName
    ? user.fullName.split(" ")[0]
    : "Teacher";

  const stats = [
    {
      title: "Assignments",
      value: assessments.length,
      description: "Created quizzes & exams",
      icon: BookOpen,
      color: "from-blue-500 to-indigo-600",
      path: "/assignments",
    },
    {
      title: "Course Folders",
      value: coursesCount,
      description: "Organized subjects",
      icon: FolderOpen,
      color: "from-amber-500 to-orange-600",
      path: "/library",
    },
    {
      title: "Study Materials",
      value: pdfsCount,
      description: "Syllabi & notes parsed",
      icon: FileText,
      color: "from-emerald-500 to-teal-600",
      path: "/library",
    },
    {
      title: "Toolkits",
      value: 4,
      description: "AI generation tools",
      icon: Wrench,
      color: "from-purple-500 to-pink-600",
      path: "/toolkit",
    },
  ];

  const quickActions = [
    {
      title: "Create AI Assignment",
      description: "Generate customized exams and tests using syllabus material or a question bank.",
      icon: Plus,
      path: "/assignments/create",
      tag: "AI Guided",
      tagColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    },
    {
      title: "Study Roadmap",
      description: "Upload syllabus guidelines to render visual, step-by-step topic roadmaps for students.",
      icon: TrendingUp,
      path: "/library",
      tag: "Roadmap",
      tagColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      title: "AI Lesson Planner",
      description: "Draft comprehensive lecture schedules, material requirements, and learning objectives.",
      icon: Sparkles,
      path: "/toolkit/lesson-plan",
      tag: "Toolkit",
      tagColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
      title: "Question Bank",
      description: "Compile collections of multiple-choice, short-answer, and long-form questions.",
      icon: GraduationCap,
      path: "/toolkit/question-bank",
      tag: "Toolkit",
      tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-8 pb-20">
        
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-orange-400/20 to-rose-400/20 blur-3xl dark:from-orange-600/10 dark:to-rose-600/10" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-400/20 to-blue-400/20 blur-3xl dark:from-indigo-600/10 dark:to-blue-600/10" />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {getGreeting()}, <span className="text-[#EA580C]">{formattedName}</span>!
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xl">
              Welcome back to your workspace. Here is an overview of your active materials, created assignments, and AI assistant tools.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(stat.path)}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                      {loading ? "..." : stat.value}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-gray-800 dark:text-gray-200">
                      {stat.title}
                    </h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-gray-800 text-[#EA580C] dark:text-orange-400 border border-orange-100 dark:border-orange-500/10 group-hover:scale-105 transition-transform duration-200">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-gray-400 font-medium">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Main Dashboard Layout Splits */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Quick Actions - 2 Columns wide */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#EA580C]" />
                Quick Actions
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => navigate(action.path)}
                    className="group flex flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", action.tagColor)}>
                          {action.tag}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#EA580C] dark:group-hover:text-orange-400 transition-colors">
                        {action.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-400 leading-relaxed font-medium">
                        {action.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-end">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Launch <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Assignments - 1 Column wide */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Recent Assignments
              </h2>
              {assessments.length > 0 && (
                <button
                  onClick={() => navigate("/assignments")}
                  className="text-xs font-bold text-[#EA580C] hover:underline"
                >
                  View All
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4 h-full">
              {loading ? (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 p-8 min-h-[220px]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-black dark:border-white border-t-transparent"></div>
                </div>
              ) : assessments.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 p-8 text-center min-h-[220px]">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">No assignments yet</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-400 max-w-[180px] mx-auto mb-4 leading-normal">
                    Generate structured exams using standard templates.
                  </p>
                  <button
                    onClick={() => navigate("/assignments/create")}
                    className="flex items-center gap-1.5 rounded-full bg-zinc-950 dark:bg-zinc-50 px-6 py-2.5 text-xs font-bold text-zinc-50 dark:text-zinc-950 hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-all shadow-sm"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Create Assignment</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {assessments.map((item) => {
                    const dateFormatted = item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString("en-GB")
                      : "Recent";
                    
                    const isFailed = item.status === "failed";
                    const isProcessing = ["queued", "processing"].includes(item.status);
                    
                    return (
                      <div
                        key={item._id}
                        onClick={() => navigate(`/assignments/${item._id}`)}
                        className="group flex flex-col justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-[0_2px_6px_rgba(0,0,0,0.01)] hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white group-hover:underline truncate max-w-[180px]">
                            {item.title || `Quiz on ${item.subject}`}
                          </h3>
                          <span
                            className={cn(
                              "text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                              isFailed
                                ? "bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/30"
                                : isProcessing
                                ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30 animate-pulse"
                                : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30"
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between text-[9px] text-gray-400 font-medium">
                          <span className="text-gray-500 dark:text-gray-300 font-semibold">{item.subject}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dateFormatted}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
        </div>

      </div>
    </Layout>
  );
};

export default Home;
