import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4004";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (refreshToken) {
      config.headers["x-refresh-token"] = refreshToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === "/auth/refresh") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.get<{ accessToken: string; refreshToken: string }>("/auth/refresh");
        const { accessToken, refreshToken } = response.data;

        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.dispatchEvent(new Event("auth-expired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface User {
  _id: string;
  email: string;
  verified: boolean;
  fullName?: string;
  avatarUrl?: string;
  institutionName?: string;
  branch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface AssessmentConfig {
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  difficultyDistribution: DifficultyDistribution;
  instructions: string;
  subject: string;
  duration: number;
}

export interface GeneratedQuestion {
  questionNumber: number;
  text: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  bloomLevel: string;
  type: string;
  options?: string[];
  answer?: string;
}

export interface GeneratedSection {
  title: string;
  instruction: string;
  questions: GeneratedQuestion[];
}

export interface PaperMetadata {
  subject: string;
  totalMarks: number;
  duration: number;
  generatedAt: string;
  instructions: string;
}

export interface GeneratedPaper {
  metadata: PaperMetadata;
  sections: GeneratedSection[];
}

export interface Assessment {
  _id: string;
  title: string;
  teacherId: string;
  sourceType: "text" | "pdf" | "none";
  sourceContent?: string;
  dueDate?: string;
  instructions?: string;
  subject: string;
  duration: number;
  questionTypes: string[];
  difficultyDistribution: DifficultyDistribution;
  totalQuestions: number;
  totalMarks: number;
  status: "draft" | "queued" | "processing" | "completed" | "failed";
  generatedPaper?: GeneratedPaper;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentJob {
  _id: string;
  jobId: string;
  assessmentId: string;
  teacherId: string;
  status: "queued" | "processing" | "generating_sections" | "formatting" | "completed" | "failed";
  progress: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Auth endpoints
export const authApi = {
  register: (data: RegisterData) => api.post("/auth/register", data),
  login: (data: LoginData) => api.post("/auth/login", data),
  logout: () => api.get("/auth/logout"),
  refresh: () => api.get("/auth/refresh"),
};

// User endpoints
export const userApi = {
  getProfile: () => api.get<User>("/user"),
  updateProfile: (data: {
    fullName?: string;
    avatarUrl?: string;
    institutionName?: string;
    branch?: string;
  }) => api.patch<User>("/user", data),
};

// VedaAI Assessment endpoints
export const assessmentApi = {
  create: (data: {
    title: string;
    subject: string;
    duration: number;
    totalQuestions: number;
    totalMarks: number;
    questionTypes: string[];
    difficultyDistribution: DifficultyDistribution;
    dueDate?: string;
    instructions?: string;
    sourceType?: "text" | "pdf" | "none";
    sourceContent?: string;
  }) => api.post<{ success: boolean; data: { jobId: string; assessmentId: string } }>("/api/assessments/create", data),

  list: (page = 1, limit = 10) =>
    api.get<{
      success: boolean;
      data: {
        assessments: Assessment[];
        total: number;
        page: number;
        pages: number;
      };
    }>(`/api/assessments?page=${page}&limit=${limit}`),

  get: (id: string) => api.get<{ success: boolean; data: Assessment }>(`/api/assessments/${id}`),

  regenerate: (id: string) =>
    api.post<{ success: boolean; data: { jobId: string; assessmentId: string } }>(`/api/assessments/${id}/regenerate`),

  delete: (id: string) => api.delete<{ success: boolean }>(`/api/assessments/${id}`),

  getJobStatus: (jobId: string) =>
    api.get<{ success: boolean; data: AssessmentJob }>(`/api/assessments/job/${jobId}/status`),

  getPdfUrl: (id: string) => `${API_BASE_URL}/api/assessments/${id}/pdf`,
};

// Core feature endpoints
export const coreApi = {
  parsePDF: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/parsePDF', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  parseImg: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/parseImg', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  parseLink: () => api.post('/api/parseLink'),
  getToken: () => api.get('/api/getToken'),
  deleteToken: () => api.post('/api/deleteToken'),
  getRoadmap: () => api.get('/api/getRoadmap'),
};

// PDF Management endpoints
export const pdfApi = {
  uploadPDF: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/pdfs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listPDFs: () => api.get('/api/pdfs'),
  getPDFMetadata: (pdfId: string) => api.get(`/api/pdfs/${pdfId}`),
  viewPDF: (pdfId: string) => `${API_BASE_URL}/api/pdfs/${pdfId}/view`,
  generateRoadmap: (pdfId: string) => api.post(`/api/pdfs/${pdfId}/roadmap`),
  getRoadmapForPDF: (pdfId: string) => api.get(`/api/pdfs/${pdfId}/roadmap`),
  deletePDF: (pdfId: string) => api.delete(`/api/pdfs/${pdfId}`),
  explainTopic: (pdfId: string, unitIndex: number, topicIndex: number, data: { topicTitle: string; topicSummary: string }) =>
    api.post(`/api/pdfs/${pdfId}/topic/${unitIndex}/${topicIndex}/explain`, data),
};

// Toolkit endpoints
export const toolkitApi = {
  generateLessonPlan: (data: {
    topic: string;
    subject: string;
    gradeLevel: string;
    duration: number;
    objectives?: string;
    teachingStyle: "lecture" | "activity-based" | "discussion" | "mixed";
  }) => api.post<{
    success: boolean;
    data: {
      metadata: {
        topic: string;
        subject: string;
        gradeLevel: string;
        duration: number;
        generatedAt: string;
      };
      objectives: string[];
      sections: {
        title: string;
        duration: number;
        description: string;
        teacherActions: string[];
        studentActions: string[];
        materials: string[];
      }[];
      assessment: string;
      homework: string;
      teacherNotes: string;
    };
  }>("/api/toolkit/lesson-plan", data),

  generateRubric: (data: {
    assignmentTitle: string;
    assignmentType: "essay" | "project" | "presentation" | "lab-report" | "creative" | "other";
    gradeLevel: string;
    totalMarks: number;
    criteria?: string;
    performanceLevels: number;
  }) => api.post<{
    success: boolean;
    data: {
      _id: string;
      metadata: {
        assignmentTitle: string;
        assignmentType: string;
        gradeLevel: string;
        totalMarks: number;
        generatedAt: string;
      };
      criteria: {
        name: string;
        weight: number;
        marks: number;
        levels: {
          label: string;
          score: number;
          descriptor: string;
        }[];
      }[];
    };
  }>("/api/toolkit/rubric", data),

  getRubricPdfUrl: (id: string) => `${API_BASE_URL}/api/toolkit/rubric/${id}/pdf`,
};
