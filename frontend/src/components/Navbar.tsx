import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, ChevronDown, LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/assignments/") ? "Assignment" : "Dashboard");

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : "JD");

  const displayName = user?.fullName || user?.email?.split("@")[0] || "John Doe";

  return (
    <nav className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm mb-3">
      {/* Left: back + page title */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button
          onClick={() => navigate(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <LayoutGrid className="h-4 w-4 text-gray-400" />
        <span className="font-medium text-gray-700">{pageTitle}</span>
      </div>

      {/* Right: bell + user */}
      <div className="flex items-center gap-3">
        <button className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <Bell className="h-4 w-4 text-gray-500" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full hover:bg-gray-50 px-2 py-1 transition-colors">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-7 w-7 rounded-full object-cover border border-amber-200"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 border border-amber-200 text-xs font-bold text-amber-700">
                  {initials}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">{displayName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuLabel className="text-xs">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-sm">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
