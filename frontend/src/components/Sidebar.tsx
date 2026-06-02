import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Settings,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { AdeptLogo } from "./AdeptLogo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { api, assessmentApi } from "@/lib/api";
import { toast } from "sonner";
import { PDF } from "@/types";
import { useUIStore } from "@/store/uiStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const currentPath = location.pathname;
  const isOutputPage = /^\/assignments\/[a-f0-9]+$/i.test(currentPath) && !currentPath.endsWith("/create");
  const isCreatePage = currentPath === "/assignments/create";
  const isListPage = currentPath === "/" || currentPath === "/assignments";

  const logoVariant = isOutputPage ? 1 : 2;

  const ctaText = isOutputPage ? "AI Teacher's Toolkit" : "Create Assignment";
  const ctaIcon = isOutputPage ? (
    <Sparkles className="h-4 w-4 text-white flex-shrink-0" />
  ) : (
    <Plus className="h-4 w-4 text-white flex-shrink-0" />
  );

  const handleCtaClick = () => {
    if (!isCreatePage) {
      navigate("/assignments/create");
    }
  };

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

  const getInitials = () => {
    if (!user) return "V";
    const namePart = user.fullName?.trim() || "";
    const schoolPart = user.schoolName?.trim() || user.institutionName?.trim() || "";
    const nameInitial = namePart ? namePart.charAt(0) : "";
    const schoolInitial = schoolPart ? schoolPart.charAt(0) : "";
    return (nameInitial + schoolInitial).toUpperCase() || "V";
  };

  const hasSchoolInfo = !!(user?.schoolName || user?.institutionName);

  const schoolAvatar = (user?.avatarBase64 || user?.avatarUrl) ? (
    <img
      src={user.avatarBase64 || user.avatarUrl}
      alt="Avatar"
      className="h-9 w-9 min-w-[36px] min-h-[36px] rounded-full object-cover border border-amber-200 flex-shrink-0"
    />
  ) : isOutputPage ? (
    <div className="flex h-9 w-9 min-w-[36px] min-h-[36px] items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    </div>
  ) : (
    <div className="h-9 w-9 min-w-[36px] min-h-[36px] overflow-hidden rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-bold text-amber-700">{getInitials()}</span>
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
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "relative flex h-full flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-6 font-sans shadow-[0_8px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-200 ease-in-out",
          isSidebarCollapsed ? "w-[68px] px-3" : "w-64 px-5"
        )}
        style={{ overflow: "visible" }}
      >
        {/* Collapse toggle button — vertically centered on right edge */}
        <button
          onClick={toggleSidebar}
          className="absolute z-50 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ right: "-14px", top: "50%", transform: "translateY(-50%)" }}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div
            onClick={() => navigate("/")}
            className={cn("cursor-pointer overflow-hidden", isSidebarCollapsed ? "px-0" : "px-2")}
          >
            {isSidebarCollapsed ? (
              <img src="/logo.png" alt="AdeptAi" className="h-9 w-9 object-contain rounded-xl shadow-sm rotate-180" />
            ) : (
              <AdeptLogo variant={logoVariant} />
            )}
          </div>

          {/* CTA Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCtaClick}
                className={cn(
                  "flex w-full items-center rounded-full py-3 text-sm font-semibold transition-all",
                  isSidebarCollapsed ? "justify-center px-0" : "justify-center px-4",
                  isOutputPage
                    ? "bg-[#111111] dark:bg-white text-white dark:text-black hover:bg-opacity-90"
                    : "border-2 border-[#EA580C] bg-[#111111] dark:bg-orange-600/10 text-white dark:text-orange-400 hover:bg-gray-900 dark:hover:bg-orange-600/20"
                )}
              >
                {ctaIcon}
                {!isSidebarCollapsed && <span className="ml-2">{ctaText}</span>}
              </button>
            </TooltipTrigger>
            {isSidebarCollapsed && (
              <TooltipContent side="right">
                <p>{ctaText}</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1 mt-4">
            {navItems.map((item) => {
              const isActive =
                (item.path === "/" && isListPage) ||
                (item.path === "/assignments" && (isListPage || isOutputPage)) ||
                (currentPath.startsWith(item.path) && item.path !== "/");
              const IconComp = item.icon;

              const navButton = (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path === "/" ? "/" : item.path)}
                  className={cn(
                    "flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800",
                    isSidebarCollapsed ? "justify-center" : "justify-between",
                    isActive && "bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-white"
                  )}
                >
                  <div className={cn("flex items-center", !isSidebarCollapsed && "gap-3")}>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                      <IconComp />
                    </span>
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isSidebarCollapsed && item.badge != null && (
                    <span className="flex h-5 items-center justify-center rounded-full bg-orange-500 px-2 text-[11px] font-bold text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </button>
              );

              return isSidebarCollapsed ? (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                navButton
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate("/settings")}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
                  isSidebarCollapsed && "justify-center",
                  currentPath === "/settings" && "bg-gray-100 dark:bg-gray-800 font-semibold text-gray-800 dark:text-white"
                )}
              >
                <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Settings</span>}
              </button>
            </TooltipTrigger>
            {isSidebarCollapsed && (
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* School Card with DropdownMenu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-left hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500",
                  isSidebarCollapsed ? "justify-center" : "gap-3"
                )}
              >
                {schoolAvatar}
                {!isSidebarCollapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    {hasSchoolInfo ? (
                      <>
                        <span className="truncate text-[13px] font-bold text-gray-800 dark:text-gray-200 leading-tight">
                          {user?.schoolName || user?.institutionName}
                        </span>
                        <span className="truncate text-[11px] text-gray-500 dark:text-gray-400 regular leading-tight">
                          {user?.city || user?.branch}
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] font-bold text-gray-500 dark:text-gray-400 leading-tight">
                        Set up your profile
                      </span>
                    )}
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-auto" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isSidebarCollapsed ? "right" : "top"}
              align={isSidebarCollapsed ? "start" : "center"}
              sideOffset={10}
              className="w-56 rounded-xl p-1.5 shadow-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-850 dark:text-gray-100"
            >
              <div className="px-2 py-1.5">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{user?.fullName || "Teacher"}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800"
              >
                <Settings className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30"
              >
                <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
};
