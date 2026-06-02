export interface User {
  _id: string;
  email: string;
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

export interface PDF {
  id: string;
  filename: string;
  originalName: string;
  uploadDate: string;
  fileSize: number;
  hasRoadmap: boolean;
  lastRoadmapGeneration?: string;
  isSyllabus?: boolean;
  roadmapStatus: "not_started" | "queued" | "processing" | "ready" | "failed";
  vectorStatus: "not_started" | "queued" | "processing" | "ready" | "failed" | "na";
  roadmapError?: string;
  vectorError?: string;
  supabaseUrl?: string;
  courseId?: string;
  faqs?: string[];
}

export interface RoadmapItem {
  title: string;
  summary: string;
  links?: Record<string, string>;
}

export type Roadmap = Record<string, Record<string, RoadmapItem>>;
