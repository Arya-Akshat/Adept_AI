import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Settings,
  Sparkles,
  Plus
} from "lucide-react";
import { VedaLogo } from "./VedaLogo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { api, assessmentApi } from "@/lib/api";
import { toast } from "sonner";
import { PDF } from "@/types";

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const currentPath = location.pathname;
  const isOutputPage = /^\/assignments\/[a-f0-9]+$/i.test(currentPath) && !currentPath.endsWith("/create");
  const isCreatePage = currentPath === "/assignments/create";
  const isListPage = currentPath === "/" || currentPath === "/assignments";

  // Context-specific logo variant
  const logoVariant = isOutputPage ? 1 : 2;

  // Context-specific CTA button
  const ctaText = isOutputPage ? "AI Teacher's Toolkit" : "Create Assignment";
  const ctaIcon = isOutputPage ? (
    <Sparkles className="mr-2 h-4 w-4 text-white" />
  ) : (
    <Plus className="mr-2 h-4 w-4 text-white" />
  );

  const handleCtaClick = () => {
    if (!isCreatePage) {
      navigate("/assignments/create");
    }
  };

  // Dynamic Nav badges
  const [assignmentsCount, setAssignmentsCount] = useState<number>(0);
  const [libraryCount, setLibraryCount] = useState<number>(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const assResponse = await assessmentApi.list(1, 1);
        if (assResponse.data && assResponse.data.success) {
          setAssignmentsCount(assResponse.data.data.total);
        }
      } catch (e) {
        // Silent catch
      }

      try {
        const libResponse = await api.get<PDF[]>("/api/pdfs");
        if (libResponse.data) {
          setLibraryCount(libResponse.data.length);
        }
      } catch (e) {
        // Silent catch
      }
    };

    fetchCounts();
  }, [currentPath]);

  let assignmentsBadge: number | null = null;
  let libraryBadge: number | null = null;

  if (isListPage) {
    assignmentsBadge = assignmentsCount;
  } else if (isCreatePage) {
    libraryBadge = libraryCount;
  } else if (isOutputPage) {
    assignmentsBadge = libraryCount;
  }

  // School card avatar
  const schoolAvatar = user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt="Avatar"
      className="h-9 w-9 rounded-full object-cover border border-amber-200"
    />
  ) : isOutputPage ? (
    // School Crest / Shield
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    </div>
  ) : (
    // Stylized Avatar/Character Illustration
    <div className="h-9 w-9 overflow-hidden rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
      <span className="text-sm font-bold text-amber-700">DPS</span>
    </div>
  );

  const navItems = [
    {
      label: "Home",
      path: "/",
      icon: () => (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="11" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="1" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      label: "My Groups",
      path: "/groups",
      icon: () => (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M12 8C13.657 8 15 6.657 15 5C15 3.343 13.657 2 12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M13.5 11C15.433 11.5 17 12.6 17 14V15H1V14C1 12.6 2.567 11.5 4.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M4.5 11C5.4 10.4 6.1 10 7 10C7.9 10 8.6 10.4 9.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Assignments",
      path: "/assignments",
      badge: assignmentsBadge,
      icon: () => (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="3" y="1" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6 5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M6 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M6 11H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "AI Teacher's Toolkit",
      path: "/toolkit",
      icon: () => (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6 13V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 13V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M4 15H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="9" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      label: "My Library",
      path: "/library",
      badge: libraryBadge,
      icon: () => (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 5V9L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col justify-between rounded-2xl border border-gray-100 bg-white px-5 py-6 font-sans shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div onClick={() => navigate("/")} className="px-2 cursor-pointer">
          <VedaLogo variant={logoVariant} />
        </div>

        {/* CTA Button - orange border style */}
        <button
          onClick={handleCtaClick}
          className={cn(
            "flex w-full items-center justify-center rounded-full py-3 px-4 text-sm font-semibold transition-all",
            isOutputPage
              ? "bg-[#111111] text-white hover:bg-opacity-90"
              : "border-2 border-[#EA580C] bg-[#111111] text-white hover:bg-gray-900"
          )}
        >
          {ctaIcon}
          {ctaText}
        </button>

        {/* Nav Items */}
        <nav className="flex flex-col gap-1 mt-4">
        {navItems.map((item) => {
            const isActive = 
              (item.path === "/" && isListPage) || 
              (item.path === "/assignments" && (isListPage || isOutputPage)) || 
              currentPath.startsWith(item.path) && item.path !== "/";
            const IconComp = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path === "/" ? "/" : item.path)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50",
                  isActive && "bg-gray-100 font-semibold"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    <IconComp />
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge != null && (
                  <span className="flex h-5 items-center justify-center rounded-full bg-orange-500 px-2 text-[11px] font-bold text-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        {/* Settings */}
        <button 
          onClick={() => navigate("/settings")}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50",
            currentPath === "/settings" && "bg-gray-100 font-semibold text-gray-800"
          )}
        >
          <Settings className="h-5 w-5 text-gray-500" />
          <span>Settings</span>
        </button>

        {/* School Card */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {schoolAvatar}
          <div className="flex flex-col min-w-0">
            <span className="truncate text-[13px] font-bold text-gray-800 leading-tight">
              {user?.institutionName || "Delhi Public School"}
            </span>
            <span className="truncate text-[11px] text-gray-500 regular leading-tight">
              {user?.branch || "Bokaro Steel City"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
