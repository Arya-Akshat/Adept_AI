import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreVertical, Eye, Trash2, SlidersHorizontal } from "lucide-react";
import { assessmentApi, Assessment } from "@/lib/api";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Fetch assessments from API
  const fetchAssessments = async () => {
    try {
      const response = await assessmentApi.list(1, 100);
      if (response.data && response.data.success) {
        setAssessments(response.data.data.assessments);
      }
    } catch (error) {
      console.error("Failed to fetch assessments", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;

    try {
      await assessmentApi.delete(id);
      toast.success("Assignment deleted successfully");
      fetchAssessments();
    } catch (err) {
      toast.error("Failed to delete assignment");
    } finally {
      setActiveMenuId(null);
    }
  };

  const handleCardClick = (id: string) => {
    navigate(`/assignments/${id}`);
  };

  // Filter & Search
  const filteredAssessments = assessments.filter((item) =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  const isEmpty = assessments.length === 0;

  return (
    <Layout>
      {/* Subheader */}
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <h2 className="text-xl font-bold text-gray-800">Assignments</h2>
        </div>
        <p className="text-sm text-gray-500">
          Manage and create assignments for your classes.
        </p>
      </div>

      {isEmpty ? (
        // Empty State: Matches dashboard.png
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          {/* Illustration matching reference */}
          <div className="relative mb-10 flex items-center justify-center" style={{ width: 280, height: 220 }}>
            {/* Background circle */}
            <div className="absolute" style={{ width: 200, height: 200, borderRadius: "50%", background: "#EBEBEB", top: 10, left: 40 }} />

            {/* Tag Card behind document */}
            <svg className="absolute" style={{ top: 38, right: 55 }} width="65" height="42" viewBox="0 0 65 42" fill="none">
              <rect width="65" height="42" rx="8" fill="#E5E7EB"/>
              <circle cx="18" cy="21" r="5" fill="white"/>
              <rect x="28" y="17" width="24" height="8" rx="4" fill="white"/>
            </svg>

            {/* Document page */}
            <svg className="absolute" style={{ top: 40, left: 75 }} width="110" height="130" viewBox="0 0 110 130" fill="none">
              <rect x="0" y="0" width="100" height="120" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
              <circle cx="20" cy="18" r="5" fill="#D1D5DB"/>
              <rect x="32" y="13" width="40" height="8" rx="4" fill="#D1D5DB"/>
              <rect x="12" y="38" width="76" height="8" rx="4" fill="#E5E7EB"/>
              <rect x="12" y="52" width="76" height="8" rx="4" fill="#E5E7EB"/>
              <rect x="12" y="66" width="50" height="8" rx="4" fill="#E5E7EB"/>
            </svg>

            {/* Squiggle pen mark */}
            <svg className="absolute" style={{ top: 65, left: 18 }} width="60" height="50" viewBox="0 0 60 50" fill="none">
              <path d="M10 40 Q20 10 35 25 Q45 35 55 5" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>

            {/* Magnifying glass with red X */}
            <svg className="absolute" style={{ top: 55, left: 95 }} width="120" height="120" viewBox="0 0 120 120" fill="none">
              {/* Glass circle */}
              <circle cx="55" cy="55" r="42" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="3"/>
              {/* Red X */}
              <line x1="38" y1="38" x2="72" y2="72" stroke="#EF4444" strokeWidth="7" strokeLinecap="round"/>
              <line x1="72" y1="38" x2="38" y2="72" stroke="#EF4444" strokeWidth="7" strokeLinecap="round"/>
              {/* Handle */}
              <line x1="87" y1="87" x2="110" y2="110" stroke="#9CA3AF" strokeWidth="8" strokeLinecap="round"/>
            </svg>

            {/* Blue sparkle dot */}
            <svg className="absolute" style={{ top: 110, right: 55 }} width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="6" fill="#3B82F6"/>
            </svg>

            {/* Blue 4-point star */}
            <svg className="absolute" style={{ bottom: 70, left: 55 }} width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 0L11.5 8.5L20 10L11.5 11.5L10 20L8.5 11.5L0 10L8.5 8.5L10 0Z" fill="#3B82F6"/>
            </svg>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-3">No assignments yet</h3>
          <p className="max-w-md text-sm text-gray-500 mb-8 leading-relaxed">
            Create your first assignment to start collecting and grading student submissions.
            You can set up rubrics, define marking criteria, and let AI assist with grading.
          </p>

          <button
            onClick={() => navigate("/assignments/create")}
            className="flex items-center gap-2 rounded-full bg-black py-3.5 px-6 text-sm font-semibold text-white shadow-md hover:bg-gray-900 transition-all"
          >
            <Plus className="h-5 w-5 text-white" />
            <span>Create Your First Assignment</span>
          </button>
        </div>
      ) : (
        // Filled State: Matches filled-state.png
        <div className="flex flex-col gap-6">
          {/* Filter Bar */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
              <SlidersHorizontal className="h-4 w-4 text-gray-500" />
              <span>Filter By</span>
            </button>
            <div className="relative w-72">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-xs placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Search Assignment"
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {filteredAssessments.map((item) => {
              const formattedAssigned = item.createdAt 
                ? new Date(item.createdAt).toLocaleDateString("en-GB") 
                : "20-06-2025";
              
              const formattedDue = item.dueDate 
                ? new Date(item.dueDate).toLocaleDateString("en-GB") 
                : "21-06-2025";

              return (
                <div
                  key={item._id}
                  onClick={() => handleCardClick(item._id)}
                  className="relative flex flex-col justify-between min-h-[130px] cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:border-gray-200 transition-all group"
                >
                  {/* Top Row: Title & Action Menu */}
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-black group-hover:underline leading-snug pr-8 decoration-1 decoration-gray-400">
                      {item.title || `Quiz on ${item.subject}`}
                    </h3>

                    {/* Ellipsis Action menu */}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === item._id ? null : item._id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-50 text-gray-500"
                      >
                        <MoreVertical className="h-4.5 w-4.5" />
                      </button>

                      {activeMenuId === item._id && (
                        <div className="absolute right-0 mt-1 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-lg z-10 font-sans">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(item._id);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View Assignment</span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(item._id, e)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Dates */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900">Assigned on</span> : <span className="font-semibold text-gray-700">{formattedAssigned}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Due</span> : <span className="font-semibold text-gray-700">{formattedDue}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating "+ Create Assignment" at bottom */}
          <div className="fixed bottom-6 right-8 z-20">
            <button
              onClick={() => navigate("/assignments/create")}
              className="flex items-center gap-2 rounded-full bg-black py-3 px-5 text-sm font-semibold text-white shadow-lg hover:bg-gray-900 transition-all hover:scale-[1.02]"
            >
              <Plus className="h-5 w-5 text-white" />
              <span>Create Assignment</span>
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};
export default Dashboard;
