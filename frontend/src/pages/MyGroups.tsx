import React from "react";
import { Layout } from "@/components/Layout";
import { Users, Plus, BookOpen, MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const MyGroups: React.FC = () => {
  const mockGroups = [
    { id: "1", name: "Grade 8 - Mathematics", subject: "Maths", students: 32, assignments: 12, code: "MTH-08" },
    { id: "2", name: "Grade 9 - Physics", subject: "Physics", students: 28, assignments: 8, code: "PHY-09" },
    { id: "3", name: "Grade 10 - Chemistry", subject: "Chemistry", students: 30, assignments: 15, code: "CHM-10" },
  ];

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
          <h2 className="text-xl font-bold text-gray-800">My Groups</h2>
        </div>
        <p className="text-sm text-gray-500">
          Manage classes, check student progress, and monitor submissions.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Create Group CTA */}
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total active groups: {mockGroups.length}
          </span>
          <button 
            onClick={() => toast.success("Create Group functionality coming soon!")}
            className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-900 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Group</span>
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {mockGroups.map((group) => (
            <div
              key={group.id}
              className="relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:border-gray-200 transition-all group cursor-pointer"
              onClick={() => toast.info(`Viewing details for ${group.name}`)}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#EA580C] border border-orange-100">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                    CODE: {group.code}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 leading-snug group-hover:text-black mb-1">
                  {group.name}
                </h3>
                <p className="text-xs text-gray-400 font-medium mb-6">{group.subject}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-gray-400" />
                  <span>{group.assignments} Assignments</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span>{group.students} Students</span>
                </div>
              </div>

              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default MyGroups;
