export const ASSESSMENT_STATUSES = [
  "draft",
  "queued",
  "processing",
  "generating_sections",
  "formatting",
  "completed",
  "failed",
] as const;

export type AssessmentStatus = typeof ASSESSMENT_STATUSES[number];

export const JOB_STATUSES = [
  "queued",
  "processing",
  "generating_sections",
  "formatting",
  "completed",
  "failed",
] as const;

export type JobStatus = typeof JOB_STATUSES[number];

export const STATUS_PROGRESS: Record<JobStatus, number> = {
  queued: 0,
  processing: 10,
  generating_sections: 40,
  formatting: 75,
  completed: 100,
  failed: 0,
};

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

export interface AssessmentJobData {
  assessmentId: string;
  teacherId: string;
  sourceType: "text" | "pdf" | "none";
  sourceContent: string;
  config: AssessmentConfig;
}

export interface GeneratedQuestion {
  questionNumber: number;
  text: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  bloomLevel: string;
  type: string;
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
  generatedAt: Date;
  instructions: string;
}

export interface GeneratedPaper {
  metadata: PaperMetadata;
  sections: GeneratedSection[];
}

export interface AssessmentSocketPayload {
  jobId: string;
  assessmentId: string;
  status: JobStatus;
  progress: number;
  message?: string;
  result?: GeneratedPaper;
  error?: string;
}
