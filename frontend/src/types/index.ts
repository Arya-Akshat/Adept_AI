export interface User {
  _id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface PDF {
  _id: string;
  filename: string;
  originalName: string;
  uploadDate: string;
  fileSize: number;
  hasRoadmap: boolean;
  lastRoadmapGeneration?: string;
}

export interface RoadmapItem {
  title: string;
  summary: string;
  links?: Record<string, string>;
}

export type Roadmap = Record<string, Record<string, RoadmapItem>>;
