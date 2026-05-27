import React from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#E5E7EB] font-sans p-3 gap-3">
      {/* Floating Sidebar — card with rounded corners and gap from edges */}
      <div className="flex-shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Floating Navbar */}
        <Navbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
};
