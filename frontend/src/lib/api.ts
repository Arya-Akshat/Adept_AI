import axios from 'axios';

const API_BASE_URL = 'http://localhost:4004';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints
export const authApi = {
  register: (data: { email: string; password: string; confirmPassword: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.get('/auth/logout'),
  refresh: () => api.get('/auth/refresh'),
};

// User endpoints
export const userApi = {
  getProfile: () => api.get('/user'),
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

export { API_BASE_URL };
