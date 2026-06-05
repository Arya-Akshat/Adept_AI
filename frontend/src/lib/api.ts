import axios from "axios";
import { Group, Student } from "@/types/groups";

export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4004" : "https://adept-ai.onrender.com");

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

    if (error.response?.status === 401) {
      if (originalRequest.url === "/auth/refresh") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        const hadToken = !!(localStorage.getItem("accessToken") || localStorage.getItem("refreshToken"));
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        if (hadToken) {
          window.dispatchEvent(new Event("auth-expired"));
        }
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
        const hadToken = !!(localStorage.getItem("accessToken") || localStorage.getItem("refreshToken"));
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        if (hadToken) {
          window.dispatchEvent(new Event("auth-expired"));
        }
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
  schoolName?: string;
  city?: string;
  primarySubject?: string;
  classesTeaching?: string[];
  schoolBoard?: string;
  approximateStudents?: number | null;
  referralSource?: string;
  avatarBase64?: string;
  onboardingCompleted?: boolean;
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
    schoolName?: string;
    city?: string;
    primarySubject?: string;
    classesTeaching?: string[];
    schoolBoard?: string;
    approximateStudents?: number | null;
    referralSource?: string;
    avatarBase64?: string;
    onboardingCompleted?: boolean;
  }) => api.patch<User>("/user", data),
  completeOnboarding: (data: {
    fullName: string;
    schoolName: string;
    city: string;
    primarySubject: string;
    classesTeaching: string[];
    schoolBoard?: string;
    approximateStudents?: number | null;
    referralSource?: string;
    avatarBase64?: string;
  }) => api.post<{ success: boolean; data: { user: User } }>("/api/user/onboarding/complete", data),
};

// AdeptAi Assessment endpoints
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
  
  downloadPdf: (id: string) => api.get(`/api/assessments/${id}/pdf`, { responseType: 'blob' }),
};

// Core feature endpoints
export const coreApi = {
  parsePDF: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/pdfs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => ({
      ...res,
      data: {
        pdfId: res.data?.data?.pdfId,
        ...res.data?.data
      }
    }));
  },
  parseImg: (file: File, courseId?: string | null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (courseId) {
      formData.append('courseId', courseId);
    }
    return api.post('/api/pdfs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => ({
      ...res,
      data: {
        pdfId: res.data?.data?.pdfId,
        ...res.data?.data
      }
    }));
  },
  parseLink: () => api.post('/api/parseLink'),
  getToken: () => api.get('/api/getToken'),
  deleteToken: () => api.post('/api/deleteToken'),
  getRoadmap: () => api.get('/api/getRoadmap'),
};

// PDF Management endpoints
export const pdfApi = {
  uploadPDF: (file: File, courseId?: string | null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (courseId) {
      formData.append('courseId', courseId);
    }
    return api.post('/api/pdfs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listPDFs: () => api.get<PDF[]>('/api/pdfs'),
  getPDFMetadata: (pdfId: string) => api.get<PDF>(`/api/pdfs/${pdfId}`),
  getStatus: (pdfId: string) => api.get<{
    pdfId: string;
    roadmapStatus: PDF["roadmapStatus"];
    vectorStatus: PDF["vectorStatus"];
    roadmapError?: string;
    vectorError?: string;
  }>(`/api/pdfs/${pdfId}/status`),
  viewPDF: (pdfId: string) => `${API_BASE_URL}/api/pdfs/${pdfId}/view`,
  generateRoadmap: (pdfId: string) => api.post<{ success: boolean; data: { pdfId: string; roadmapStatus: string; vectorStatus: string } }>(`/api/pdfs/${pdfId}/roadmap`),
  getRoadmapForPDF: (pdfId: string) => api.get<{ pdfId: string; roadmap: any; cached: boolean }>(`/api/pdfs/${pdfId}/roadmap`),
  deletePDF: (pdfId: string) => api.delete<{ message: string }>(`/api/pdfs/${pdfId}`),
  explainTopic: (pdfId: string, unitIndex: number, topicIndex: number, data: { topicTitle: string; topicSummary: string }) =>
    api.post(`/api/pdfs/${pdfId}/topic/${unitIndex}/${topicIndex}/explain`, data),
  toggleTopicStudied: (pdfId: string, unitIndex: number, topicIndex: number, studied: boolean) =>
    api.patch<{ success: boolean; data: { studied: boolean } }>(`/api/pdfs/${pdfId}/topic/studied`, { unitIndex, topicIndex, studied }),
  assignFileToCourse: (pdfId: string, courseId: string | null) =>
    api.patch<{ success: boolean; data: { courseId: string | null } }>(`/api/pdfs/${pdfId}/assign-course`, { courseId }),
  saveAnswer: (pdfId: string, question: string, answer: string) =>
    api.post<any>(`/api/pdfs/${pdfId}/saved-answers`, { question, answer }),
  listSavedAnswers: (pdfId: string) =>
    api.get<any[]>(`/api/pdfs/${pdfId}/saved-answers`),
  deleteSavedAnswer: (pdfId: string, answerId: string) =>
    api.delete<{ message: string }>(`/api/pdfs/${pdfId}/saved-answers/${answerId}`),
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
  
  generatePresentation: (data: { courseId: string; fileIds: string[]; slideCount: number; topicFocus?: string }) =>
    api.post<{
      success: boolean;
      data: {
        metadata: {
          title: string;
          subject: string;
          slideCount: number;
          generatedAt: string;
        };
        slides: {
          slideNumber: number;
          title: string;
          bulletPoints: string[];
          teacherNotes?: string;
          suggestedImagePrompt: string;
        }[];
      };
    }>("/api/toolkit/presentation", data),

  downloadPresentationPptx: (data: { metadata: { title: string; subject?: string }; slides: any[] }) =>
    api.post("/api/toolkit/presentation/download", data, { responseType: "blob" }),
  getPresentation: (id: string) =>
    api.get<{ success: boolean; data: any }>(`/api/toolkit/presentation/${id}`),

  generateQuestionBank: (data: {
    courseId: string;
    fileIds: string[];
    questionCount: number;
    questionTypes: ("mcq" | "short" | "long")[];
    difficulty: "easy" | "medium" | "hard" | "mixed";
    topicFocus?: string;
  }) =>
    api.post<{
      success: boolean;
      data: {
        _id: string;
        metadata: {
          title: string;
          subject: string;
          questionCount: number;
          generatedAt: string;
        };
        questions: {
          questionNumber: number;
          questionText: string;
          type: "mcq" | "short" | "long";
          cognitiveLevel: "remembering" | "understanding" | "applying" | "analyzing" | "evaluating" | "creating";
          options?: string[];
          correctAnswer: string;
          marks: number;
          difficulty: "easy" | "medium" | "hard";
        }[];
      };
    }>("/api/toolkit/question-bank", data),

  getQuestionBank: (id: string) =>
    api.get<{ success: boolean; data: any }>(`/api/toolkit/question-bank/${id}`),
};

// Course/Subject management endpoints
export const courseApi = {
  createCourse: (data: { name: string; description?: string; color?: string }) =>
    api.post<{ _id: string; name: string; description?: string; color: string }>("/api/courses", data),
  listCourses: () =>
    api.get<any[]>("/api/courses"),
  updateCourse: (courseId: string, data: { name?: string; description?: string; color?: string }) =>
    api.patch<any>(`/api/courses/${courseId}`, data),
  deleteCourse: (courseId: string) =>
    api.delete<{ message: string }>(`/api/courses/${courseId}`),
  listPresentations: (courseId: string) =>
    api.get<any[]>(`/api/courses/${courseId}/presentations`),
  listQuestionBanks: (courseId: string) =>
    api.get<any[]>(`/api/courses/${courseId}/question-banks`),
};

// Groups & Student Roster endpoints
export const groupsApi = {
  createGroup: (data: {
    name: string;
    subject: string;
    grade: string;
    academicYear: string;
    subjectColumns?: string[];
  }) =>
    api.post<{ success: boolean; data: { group: Group } }>("/api/groups", data),

  listGroups: () =>
    api.get<{ success: boolean; data: { groups: Group[] } }>("/api/groups"),

  getGroup: (id: string) =>
    api.get<{ success: boolean; data: { group: Group } }>(`/api/groups/${id}`),

  updateGroup: (
    id: string,
    data: {
      name?: string;
      subject?: string;
      grade?: string;
      academicYear?: string;
      subjectColumns?: string[];
    }
  ) =>
    api.patch<{ success: boolean; data: { group: Group } }>(`/api/groups/${id}`, data),

  deleteGroup: (id: string) =>
    api.delete<{ success: boolean; data: { message: string } }>(`/api/groups/${id}`),

  addStudent: (
    groupId: string,
    data: {
      name: string;
      rollNumber: string;
      email?: string;
      phone?: string;
    }
  ) =>
    api.post<{ success: boolean; data: { student: Student } }>(
      `/api/groups/${groupId}/students`,
      data
    ),

  importStudentsCSV: (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{
      success: boolean;
      data: {
        imported: number;
        skipped: string[];
        errors: { row: number; error: string }[];
      };
    }>(`/api/groups/${groupId}/students/csv`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  listStudents: (
    groupId: string,
    params?: { search?: string; page?: number; limit?: number }
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    const queryString = query.toString();
    return api.get<{
      success: boolean;
      data: {
        students: Student[];
        total: number;
        page: number;
        limit: number;
      };
    }>(`/api/groups/${groupId}/students${queryString ? `?${queryString}` : ""}`);
  },

  exportStudents: (groupId: string) =>
    api.get(`/api/groups/${groupId}/students/export`, { responseType: "blob" }),

  getStudent: (groupId: string, sid: string) =>
    api.get<{ success: boolean; data: { student: Student } }>(
      `/api/groups/${groupId}/students/${sid}`
    ),

  updateStudent: (
    groupId: string,
    sid: string,
    data: {
      name?: string;
      rollNumber?: string;
      email?: string;
      phone?: string;
      overallRemark?: string;
      attendancePercent?: number | null;
      academicHistory?: {
        columnName: string;
        marks: number;
        totalMarks: number;
        remarks?: string;
      }[];
    }
  ) =>
    api.patch<{ success: boolean; data: { student: Student } }>(
      `/api/groups/${groupId}/students/${sid}`,
      data
    ),

  deleteStudent: (groupId: string, sid: string) =>
    api.delete<{ success: boolean; data: { message: string } }>(
      `/api/groups/${groupId}/students/${sid}`
    ),
};


