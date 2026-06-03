import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, MoreVertical, Edit2, Trash2, ArrowRight, BookOpen, GraduationCap, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useGroupsStore } from "@/store/groupsStore";
import { Group } from "@/types/groups";
import { toast } from "sonner";

export const MyGroups: React.FC = () => {
  const navigate = useNavigate();
  const { groups, fetchGroups, deleteGroup, loading } = useGroupsStore();
  const [activeKebabId, setActiveKebabId] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // States for Edit inline modal
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editYear, setEditYear] = useState("");

  useEffect(() => {
    fetchGroups().catch(() => {
      toast.error("Failed to load class groups");
    });
  }, [fetchGroups]);

  const handleEditClick = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroupToEdit(group);
    setEditName(group.name);
    setEditSubject(group.subject);
    setEditGrade(group.grade);
    setEditYear(group.academicYear);
    setActiveKebabId(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupToEdit || !editName.trim() || !editSubject.trim()) return;

    try {
      const { updateGroup } = useGroupsStore.getState();
      await updateGroup(groupToEdit._id, {
        name: editName.trim(),
        subject: editSubject.trim(),
        grade: editGrade.trim(),
        academicYear: editYear.trim(),
      });
      toast.success("Group updated successfully");
      setGroupToEdit(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update group");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGroup(groupToDelete._id);
      toast.success("Group deleted successfully");
      setGroupToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to delete group");
    } finally {
      setIsDeleting(false);
    }
  };

  // Close kebab menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveKebabId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  return (
    <Layout>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-55 font-sans">My Groups</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Manage your class groups and student records.
          </p>
        </div>

        {groups.length > 0 && (
          <button
            onClick={() => navigate("/groups/new")}
            className="flex items-center justify-center gap-1.5 rounded-full bg-zinc-950 dark:bg-zinc-50 px-5 py-2.5 text-xs font-semibold text-white dark:text-zinc-950 shadow-sm hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="pb-24 font-sans">
        {loading && groups.length === 0 ? (
          /* Skeleton Loader (3 Cards) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="flex flex-col justify-between h-48 rounded-2xl border border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 shadow-sm animate-pulse"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-zinc-900" />
                    <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-zinc-900" />
                  </div>
                  <div className="h-5 w-3/4 rounded bg-gray-100 dark:bg-zinc-900 mb-2" />
                  <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-zinc-900" />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-zinc-900">
                  <div className="h-4 w-24 rounded bg-gray-100 dark:bg-zinc-900" />
                  <div className="h-4 w-16 rounded bg-gray-100 dark:bg-zinc-900" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center py-20 px-4 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/5"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-zinc-200 mb-1">
              No groups yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
              Create your first class group to start managing your students and academic records.
            </p>
            <button
              onClick={() => navigate("/groups/new")}
              className="flex items-center gap-1.5 rounded-full bg-zinc-950 dark:bg-zinc-50 px-6 py-3 text-xs font-semibold text-white dark:text-zinc-950 shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Group</span>
            </button>
          </motion.div>
        ) : (
          /* Grid of Group Cards */
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.08 },
              },
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {groups.map((group) => (
              <motion.div
                key={group._id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 },
                }}
                className="relative flex flex-col justify-between rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm hover:shadow-md hover:border-gray-250 dark:hover:border-zinc-700 transition-all group cursor-pointer"
                onClick={() => navigate(`/groups/${group._id}`)}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/20 text-[#EA580C]">
                      <GraduationCap className="h-5.5 w-5.5" />
                    </div>

                    {/* Kebab Menu Container */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveKebabId(activeKebabId === group._id ? null : group._id);
                        }}
                        className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      <AnimatePresence>
                        {activeKebabId === group._id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-1 z-20 w-32 origin-top-right rounded-xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 shadow-lg outline-none"
                          >
                            <button
                              onClick={(e) => handleEditClick(group, e)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit Details</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setGroupToDelete(group);
                                setActiveKebabId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 group-hover:text-[#EA580C] dark:group-hover:text-orange-400 transition-colors mb-1 truncate leading-tight">
                    {group.name}
                  </h3>
                  <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 mb-6 uppercase tracking-wider">
                    {group.subject} · {group.grade} · {group.academicYear}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-900 text-xs font-medium text-gray-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{group.studentCount || 0} Students</span>
                  </div>

                  <div className="flex items-center gap-1 text-gray-800 dark:text-zinc-200 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>View Group</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {groupToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGroupToDelete(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all font-sans"
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 mb-2">
                Delete Group?
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to delete <strong>{groupToDelete.name}</strong>? This action is permanent and will delete all associated student records and grades.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setGroupToDelete(null)}
                  disabled={isDeleting}
                  className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="rounded-full bg-red-600 text-white px-5 py-2.5 text-xs font-semibold shadow hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {isDeleting ? "Deleting..." : "Delete Group"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit inline modal */}
      <AnimatePresence>
        {groupToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGroupToEdit(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all font-sans"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">Edit Group Details</h3>
                <button
                  onClick={() => setGroupToEdit(null)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-150 dark:hover:bg-zinc-900 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Group Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Subject</label>
                  <input
                    type="text"
                    required
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Grade Level</label>
                  <input
                    type="text"
                    required
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setGroupToEdit(null)}
                    className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 px-5 py-2 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default MyGroups;
