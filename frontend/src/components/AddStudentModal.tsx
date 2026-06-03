import React, { useState } from "react";
import { X, UserPlus, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroupsStore } from "@/store/groupsStore";
import { toast } from "sonner";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess?: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  groupId,
  onSuccess,
}) => {
  const { addStudent } = useGroupsStore();
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rollError, setRollError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNumber.trim()) return;

    setIsSubmitting(true);
    setRollError(null);

    try {
      await addStudent(groupId, {
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      toast.success("Student added successfully");
      
      // Reset form
      setName("");
      setRollNumber("");
      setEmail("");
      setPhone("");
      
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to add student";
      if (errMsg.toLowerCase().includes("roll number")) {
        setRollError(errMsg);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/20 text-[#EA580C]">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">Add Student</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Roll Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                  Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 001, 1024"
                  value={rollNumber}
                  onChange={(e) => {
                    setRollNumber(e.target.value);
                    setRollError(null);
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-900/50 text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all ${
                    rollError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 dark:border-zinc-800"
                  }`}
                />
                {rollError && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-red-500 mt-0.5">
                    <Info className="h-3.5 w-3.5" />
                    {rollError}
                  </span>
                )}
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                  Email Address <span className="text-gray-400 dark:text-zinc-500">(optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                  Phone Number <span className="text-gray-400 dark:text-zinc-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. +1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !rollNumber.trim()}
                  className="rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 px-5 py-2 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? "Adding..." : "Add Student"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
