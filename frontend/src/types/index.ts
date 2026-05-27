export interface User {
  _id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  institutionName?: string;
  branch?: string;
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
}

export interface RoadmapItem {
  title: string;
  summary: string;
  links?: Record<string, string>;
}

export type Roadmap = Record<string, Record<string, RoadmapItem>>;
