import { create } from "zustand";

export interface LibraryFileItem {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  uploadDate: string;
  fileSize: number;
  hasRoadmap: boolean;
  isSyllabus: boolean;
  roadmapStatus: "not_started" | "queued" | "processing" | "ready" | "failed";
  vectorStatus: "not_started" | "queued" | "processing" | "ready" | "failed" | "na";
  roadmapError?: string;
  vectorError?: string;
  supabaseUrl: string;
}

interface LibraryState {
  files: LibraryFileItem[];
  loading: boolean;
  setFiles: (files: LibraryFileItem[]) => void;
  updateRoadmapStatus: (pdfId: string, status: LibraryFileItem["roadmapStatus"]) => void;
  updateVectorStatus: (pdfId: string, status: LibraryFileItem["vectorStatus"]) => void;
  setLoading: (loading: boolean) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  files: [],
  loading: true,
  setFiles: (files) => set({ files }),
  updateRoadmapStatus: (pdfId, status) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === pdfId ? { ...file, roadmapStatus: status, hasRoadmap: status === "ready" } : file
      ),
    })),
  updateVectorStatus: (pdfId, status) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === pdfId ? { ...file, vectorStatus: status } : file
      ),
    })),
  setLoading: (loading) => set({ loading }),
}));
