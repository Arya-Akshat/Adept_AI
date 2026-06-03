import React, { useState, useRef } from "react";
import { X, Upload, FileText, Download, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
import { groupsApi } from "@/lib/api";
import { toast } from "sonner";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess?: () => void;
}

export const ImportCSVModal: React.FC<ImportCSVModalProps> = ({
  isOpen,
  onClose,
  groupId,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: string[];
    errors: { row: number; error: string }[];
  } | null>(null);

  // Download template client-side
  const downloadTemplate = () => {
    const csvContent =
      "Roll Number,Name,Email,Phone\r\n001,Student Name,email@example.com,9876543210\r\n002,Another Student,,\r\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student-import-template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processSelectedFile(selectedFile);
  };

  const processSelectedFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file only");
      return;
    }

    setFile(selectedFile);
    setImportResult(null);

    // Parse CSV client-side for previewing
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setTotalRows(results.data.length);
        setPreviewRows(results.data.slice(0, 5));
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      const response = await groupsApi.importStudentsCSV(groupId, file);
      setImportResult(response.data.data);
      toast.success("CSV file processed");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to import CSV file";
      toast.error(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setPreviewRows([]);
    setTotalRows(0);
    setImportResult(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/20 text-[#EA580C]">
                  <Upload className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50 font-sans">
                  Import Students from CSV
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Switcher */}
            {!importResult ? (
              <div className="flex flex-col gap-4">
                {/* Upload Dropzone */}
                {!file ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/10 py-10 px-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/30 hover:border-[#EA580C] dark:hover:border-[#EA580C] transition-all group"
                  >
                    <Upload className="h-8 w-8 text-gray-400 group-hover:text-[#EA580C] mb-3 transition-colors" />
                    <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-1">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mb-6">
                      Support .csv files only
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTemplate();
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-855 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Template</span>
                    </button>
                  </div>
                ) : (
                  /* File Loaded & Preview State */
                  <div className="flex flex-col gap-4 font-sans">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-zinc-900/50 p-4 border border-gray-100 dark:border-zinc-900">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-[#EA580C]" />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 max-w-[200px] md:max-w-[280px] truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-zinc-500">
                            {totalRows} students found
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={resetModal}
                        className="text-xs font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Change
                      </button>
                    </div>

                    {/* Preview Table */}
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                        Preview (First 5 Rows)
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-900/10">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 font-semibold text-gray-600 dark:text-zinc-300">
                              <th className="p-2.5">Roll Number</th>
                              <th className="p-2.5">Name</th>
                              <th className="p-2.5">Email</th>
                              <th className="p-2.5">Phone</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, index) => {
                              // Find normalized values case-insensitively
                              const getVal = (keys: string[]) => {
                                const matchedKey = Object.keys(row).find((k) =>
                                  keys.includes(k.toLowerCase().trim())
                                );
                                return matchedKey ? row[matchedKey] : "";
                              };
                              const roll = getVal(["roll number", "rollno", "roll_number", "roll"]);
                              const name = getVal(["name", "student name", "studentname", "full name", "fullname"]);
                              const email = getVal(["email", "email address", "email_address"]);
                              const phone = getVal(["phone", "phone number", "phone_number", "contact"]);

                              return (
                                <tr
                                  key={index}
                                  className="border-b border-gray-100 dark:border-zinc-900 text-gray-800 dark:text-zinc-200 last:border-b-0"
                                >
                                  <td className="p-2.5 font-semibold">{roll || "—"}</td>
                                  <td className="p-2.5">{name || "—"}</td>
                                  <td className="p-2.5 truncate max-w-[100px]">{email || "—"}</td>
                                  <td className="p-2.5">{phone || "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Import Button */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-900">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-full border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={isUploading}
                        className="rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 px-5 py-2 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-40 transition-colors"
                      >
                        {isUploading ? "Importing..." : `Import ${totalRows} Students`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Step 3: Result Summary Screen */
              <div className="flex flex-col gap-4 font-sans text-sm">
                <div className="flex flex-col gap-3 py-2">
                  {/* Imported Success count */}
                  <div className="flex items-start gap-3 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-zinc-200">Import Successful</h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {importResult.imported} students have been successfully registered to the database roster.
                      </p>
                    </div>
                  </div>

                  {/* Skipped Roll numbers */}
                  {importResult.skipped.length > 0 && (
                    <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                      <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 dark:text-zinc-200">
                          {importResult.skipped.length} Students Skipped
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Duplicate roll numbers detected and skipped:
                        </p>
                        <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 truncate mt-1">
                          {importResult.skipped.join(", ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Structural errors */}
                  {importResult.errors.length > 0 && (
                    <div className="flex items-start gap-3 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 dark:text-zinc-200">
                          {importResult.errors.length} Rows Had Errors
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Failed to import due to validation issues:
                        </p>
                        <div className="max-h-24 overflow-y-auto mt-2 flex flex-col gap-1 pr-1 scrollbar-thin">
                          {importResult.errors.map((err, index) => (
                            <div key={index} className="text-xs flex items-center justify-between text-red-650 dark:text-red-400 border-b border-red-50 dark:border-red-950/30 pb-0.5 last:border-b-0">
                              <span>Row {err.row}</span>
                              <span className="font-medium">{err.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer close */}
                <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-150 dark:border-zinc-900">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 px-6 py-2 text-xs font-semibold shadow hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
