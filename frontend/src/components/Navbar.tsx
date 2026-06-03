import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LayoutGrid,
  Sparkles,
  Plus,
  BookOpen,
  Presentation,
  Award,
  FileText,
  Upload,
  FileUp,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdeptLogo } from "./AdeptLogo";
import { Button } from "./ui/button";

const PAGE_TITLES: Record<string, string> = {
  "/": "Assignment",
  "/assignments": "Assignment",
  "/assignments/create": "Create Assignment",
  "/groups": "My Groups",
  "/toolkit": "AI Teacher's Toolkit",
  "/library": "My Library",
  "/settings": "Settings",
  "/syllabus": "Upload Syllabus",
  "/input-notes": "Upload Notes",
};

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLandingPage = location.pathname === "/landing";

  if (isLandingPage) {
    return (
      <header className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 shadow-sm mb-6 font-sans">
        <div onClick={() => navigate("/")} className="cursor-pointer">
          <AdeptLogo variant={2} />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          {user ? (
            <Button
              onClick={() => navigate("/")}
              className="rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 text-xs font-semibold px-5 py-2.5 h-auto shadow-sm"
            >
              Go to Dashboard
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate("/login")}
                className="text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 rounded-full h-auto text-gray-700 dark:text-gray-300"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/register")}
                className="rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 text-xs font-semibold px-5 py-2.5 h-auto shadow-sm"
              >
                Get Started
              </Button>
            </div>
          )}
        </div>
      </header>
    );
  }

  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/assignments/") ? "Assignment" : "Dashboard");

  return (
    <nav className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 shadow-sm mb-3">
      {/* Left: back + page title */}
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <button
          onClick={() => navigate(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" className="stroke-gray-500 dark:stroke-gray-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <LayoutGrid className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <span className="font-medium text-gray-700 dark:text-gray-200">{pageTitle}</span>
      </div>

      {/* Right: theme toggle + bell + Quick Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>

        <button className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-full border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/40 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400 transition-all shadow-[0_1px_2px_rgba(234,88,12,0.05)] hover:shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-orange-600 dark:text-orange-500" />
              <span>Quick Actions</span>
              <ChevronDown className="h-3.5 w-3.5 text-orange-400 dark:text-orange-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">AI Toolkit Actions</DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            
            <DropdownMenuItem onClick={() => navigate("/assignments/create")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Create Assignment</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/toolkit/question-bank")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">AI Question Bank</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/toolkit/slide-generator")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                <Presentation className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">AI Slide Generator</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/toolkit/lesson-plan")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Lesson Plan Generator</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/toolkit/rubric")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                <Award className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Instant Rubric Designer</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">File Uploads</DropdownMenuLabel>
            
            <DropdownMenuItem onClick={() => navigate("/syllabus")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <Upload className="h-3.5 w-3.5 text-gray-500" />
              Syllabus Extractor
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/input-notes")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <FileUp className="h-3.5 w-3.5 text-gray-500" />
              Study Notes Uploader
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
