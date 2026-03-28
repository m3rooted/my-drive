import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
};

export const filesAPI = {
  getFiles: (folderId) => api.get('/files', { params: { folderId } }),
  getSharedFiles: () => api.get('/files/shared'),
  uploadFile: (formData) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadFile: (id) => api.get(`/files/download/${id}`, { responseType: 'blob' }),
  deleteFile: (id) => api.delete(`/files/${id}`),
  renameFile: (id, name) => api.patch(`/files/${id}/rename`, { name }),
  getFileInfo: (id) => api.get(`/files/${id}`),
  shareFile: (id, payload) => api.post(`/files/${id}/share`, payload),
  removeShare: (id, sharedUserId) => api.delete(`/files/${id}/share/${sharedUserId}`),
};

export const foldersAPI = {
  createFolder: (folderData) => api.post('/folders', folderData),
  getFolderContents: (id) => api.get(`/folders/${id}`),
  deleteFolder: (id) => api.delete(`/folders/${id}`),
  renameFolder: (id, name) => api.patch(`/folders/${id}/rename`, { name }),
};

export const notesAPI = {
  getNotes: () => api.get('/notes'),
  createNote: (noteData) => api.post('/notes', noteData),
  updateNote: (id, noteData) => api.patch(`/notes/${id}`, noteData),
  deleteNote: (id) => api.delete(`/notes/${id}`),
};

export const getNotesStreamUrl = (token) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/notes/stream?token=${encodeURIComponent(token)}`;
};

export default api;
