import { create } from "zustand";
import { DifficultyDistribution, assessmentApi, api } from "@/lib/api";

export interface QuestionTypeRow {
  id: string;
  type: string;
  count: number;
  marks: number;
}

interface AssessmentFormState {
  title: string;
  subject: string;
  duration: number;
  dueDate: string;
  instructions: string;
  sourceType: "none" | "text" | "pdf";
  sourceFile: File | null;
  sourceContent: string;
  questionRows: QuestionTypeRow[];
  loading: boolean;
  jobId: string | null;
  assessmentId: string | null;

  // Actions
  setTitle: (title: string) => void;
  setSubject: (subject: string) => void;
  setDuration: (duration: number) => void;
  setDueDate: (dueDate: string) => void;
  setInstructions: (instructions: string) => void;
  setSourceType: (sourceType: "none" | "text" | "pdf") => void;
  setSourceFile: (file: File | null) => void;
  setSourceContent: (content: string) => void;
  
  // Question rows management
  addRow: () => void;
  removeRow: (id: string) => void;
  updateRowType: (id: string, type: string) => void;
  updateRowCount: (id: string, count: number) => void;
  updateRowMarks: (id: string, marks: number) => void;
  
  resetForm: () => void;
  submitForm: () => Promise<{ jobId: string; assessmentId: string }>;
}

const DEFAULT_ROWS: QuestionTypeRow[] = [
  { id: "1", type: "Multiple Choice Questions", count: 4, marks: 1 },
  { id: "2", type: "Short Questions", count: 3, marks: 2 },
  { id: "3", type: "Diagram/Graph-Based Questions", count: 5, marks: 5 },
  { id: "4", type: "Numerical Problems", count: 5, marks: 5 },
];

export const useAssessmentStore = create<AssessmentFormState>((set, get) => ({
  title: "",
  subject: "",
  duration: 0, // default duration in minutes
  dueDate: "",
  instructions: "",
  sourceType: "none",
  sourceFile: null,
  sourceContent: "",
  questionRows: DEFAULT_ROWS,
  loading: false,
  jobId: null,
  assessmentId: null,

  setTitle: (title) => set({ title }),
  setSubject: (subject) => set({ subject }),
  setDuration: (duration) => set({ duration }),
  setDueDate: (dueDate) => set({ dueDate }),
  setInstructions: (instructions) => set({ instructions }),
  setSourceType: (sourceType) => set({ sourceType }),
  setSourceFile: (sourceFile) => set({ sourceFile }),
  setSourceContent: (sourceContent) => set({ sourceContent }),

  addRow: () => {
    const newId = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      questionRows: [
        ...state.questionRows,
        { id: newId, type: "Multiple Choice Questions", count: 1, marks: 1 },
      ],
    }));
  },

  removeRow: (id) => {
    set((state) => ({
      questionRows: state.questionRows.filter((r) => r.id !== id),
    }));
  },

  updateRowType: (id, type) => {
    set((state) => ({
      questionRows: state.questionRows.map((r) =>
        r.id === id ? { ...r, type } : r
      ),
    }));
  },

  updateRowCount: (id, count) => {
    set((state) => ({
      questionRows: state.questionRows.map((r) =>
        r.id === id ? { ...r, count: Math.max(1, count) } : r
      ),
    }));
  },

  updateRowMarks: (id, marks) => {
    set((state) => ({
      questionRows: state.questionRows.map((r) =>
        r.id === id ? { ...r, marks: Math.max(1, marks) } : r
      ),
    }));
  },

  resetForm: () => {
    set({
      title: "",
      subject: "",
      duration: 0,
      dueDate: "",
      instructions: "",
      sourceType: "none",
      sourceFile: null,
      sourceContent: "",
      questionRows: DEFAULT_ROWS,
      loading: false,
      jobId: null,
      assessmentId: null,
    });
  },

  submitForm: async () => {
    const state = get();
    set({ loading: true });

    // Calculate total questions & total marks
    const totalQuestions = state.questionRows.reduce((sum, r) => sum + r.count, 0);
    const totalMarks = state.questionRows.reduce((sum, r) => sum + r.count * r.marks, 0);

    // Calculate difficulty distribution (we will map easy/medium/hard dynamically or split evenly)
    // To make it simple, we split total questions: 40% easy, 40% medium, 20% hard.
    const easy = Math.max(1, Math.round(totalQuestions * 0.4));
    const medium = Math.max(1, Math.round(totalQuestions * 0.4));
    const hard = Math.max(1, totalQuestions - easy - medium);
    const difficultyDistribution: DifficultyDistribution = { easy, medium, hard };

    // Format question types list
    const questionTypes = state.questionRows.map((r) => r.type);

    try {
      let finalSourceContent = state.sourceContent;
      let finalSourceType = state.sourceType;

      // Handle file upload if present
      if (state.sourceFile) {
        const formData = new FormData();
        formData.append("file", state.sourceFile);
        
        // Post to /api/pdfs/upload using Axios direct post
        const uploadRes = await api.post<{ pdfs: Array<{ id: string; filename: string }> }>(
          "/api/pdfs/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        if (uploadRes.data && uploadRes.data.pdfs && uploadRes.data.pdfs.length > 0) {
          // Pass the filename returned as sourceContent
          finalSourceContent = uploadRes.data.pdfs[0].filename;
          finalSourceType = state.sourceFile.name.endsWith(".pdf") ? "pdf" : "text";
        }
      }

      const payload = {
        title: state.title,
        subject: state.subject,
        duration: state.duration,
        totalQuestions,
        totalMarks,
        questionTypes,
        difficultyDistribution,
        dueDate: state.dueDate || undefined,
        instructions: state.instructions || undefined,
        sourceType: finalSourceType,
        sourceContent: finalSourceContent || "None",
      };

      const response = await assessmentApi.create(payload);
      const result = response.data.data;

      set({ jobId: result.jobId, assessmentId: result.assessmentId });
      return result;
    } catch (error) {
      console.error("Form submission failed", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
