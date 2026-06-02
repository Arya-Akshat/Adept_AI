import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Auth & Public Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// New Assignment Pages
import Dashboard from "./pages/Dashboard";
import CreateAssignment from "./pages/CreateAssignment";
import AssignmentOutput from "./pages/AssignmentOutput";

// Syllabus & Study Roadmap Pages
import SyllabusUpload from "./pages/SyllabusUpload";
import InputNotes from "./pages/InputNotes";
import Roadmap from "./pages/Roadmap";
import TopicDetail from "./pages/TopicDetail";
import DoubtSolverPage from "./pages/DoubtSolverPage";

// Navbar / Sidebar Dummy Pages
import MyGroups from "./pages/MyGroups";
import Toolkit from "./pages/Toolkit";
import Settings from "./pages/Settings";

// New Toolkit Pages
import LessonPlanPage from "./pages/LessonPlanPage";
import RubricPage from "./pages/RubricPage";
import SlideGeneratorPage from "./pages/SlideGeneratorPage";
import QuestionBankPage from "./pages/QuestionBankPage";


const queryClient = new QueryClient();

const App: React.FC = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/landing" element={<Landing />} />

                {/* Dashboard and Assignment Routes */}
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/assignments" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/assignments/create" element={<ProtectedRoute><CreateAssignment /></ProtectedRoute>} />
                <Route path="/assignments/:id" element={<ProtectedRoute><AssignmentOutput /></ProtectedRoute>} />

                {/* Syllabus & Study Roadmap Helper Routes */}
                <Route path="/library" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
                <Route path="/syllabus" element={<ProtectedRoute><SyllabusUpload /></ProtectedRoute>} />
                <Route path="/input-notes" element={<ProtectedRoute><InputNotes /></ProtectedRoute>} />
                <Route path="/library/:pdfId/topic/:unitIndex/:topicIndex" element={<ProtectedRoute><TopicDetail /></ProtectedRoute>} />
                <Route path="/library/:pdfId/doubt" element={<ProtectedRoute><DoubtSolverPage /></ProtectedRoute>} />
                <Route path="/roadmap" element={<Navigate to="/library" replace />} />

                {/* Sidebar Navigation Pages */}
                <Route path="/groups" element={<ProtectedRoute><MyGroups /></ProtectedRoute>} />
                <Route path="/toolkit" element={<ProtectedRoute><Toolkit /></ProtectedRoute>} />
                <Route path="/toolkit/lesson-plan" element={<ProtectedRoute><LessonPlanPage /></ProtectedRoute>} />
                <Route path="/toolkit/rubric" element={<ProtectedRoute><RubricPage /></ProtectedRoute>} />
                <Route path="/toolkit/slide-generator" element={<ProtectedRoute><SlideGeneratorPage /></ProtectedRoute>} />
                <Route path="/toolkit/question-bank" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                {/* Catch-all fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
