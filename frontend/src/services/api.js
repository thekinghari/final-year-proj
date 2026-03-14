import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bcr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bcr_token');
      localStorage.removeItem('bcr_user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════
export const authAPI = {
  register: (data) => {
    // Check if data is FormData (for admin role with file upload)
    if (data instanceof FormData) {
      return api.post('/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    // Regular JSON data for other roles
    return api.post('/auth/register', data);
  },
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ═══════════════════════════════════════════
// PROJECT API
// ═══════════════════════════════════════════
export const projectAPI = {
  // Submit project with photos (multipart/form-data)
  submit: (formData) =>
    api.post('/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Get all user's projects
  getAll: (params) => api.get('/projects', { params }),

  // Get single project
  getById: (id) => api.get(`/projects/${id}`),

  // Update project
  update: (id, formData) =>
    api.put(`/projects/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Get user's minted carbon credits
  getMyCredits: () => api.get('/projects/my-credits'),
};

// ═══════════════════════════════════════════
// OFFLINE QUEUE — Store submissions when offline
// ═══════════════════════════════════════════
const OFFLINE_QUEUE_KEY = 'bcr_offline_queue';

export const offlineQueue = {
  // Add submission to offline queue
  add: (projectData) => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({
      ...projectData,
      isOfflineSubmission: true,
      queuedAt: new Date().toISOString(),
      id: `offline_${Date.now()}`,
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return queue;
  },

  // Get all queued items
  getAll: () => JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'),

  // Remove item from queue after sync
  remove: (id) => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    const updated = queue.filter((item) => item.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    return updated;
  },

  // Clear entire queue
  clear: () => localStorage.removeItem(OFFLINE_QUEUE_KEY),

  // Get queue count
  count: () => JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]').length,

  // Sync all queued items
  syncAll: async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    const results = [];

    for (const item of queue) {
      try {
        const formData = new FormData();
        Object.keys(item).forEach((key) => {
          if (key !== 'id' && key !== 'queuedAt' && key !== 'photoFiles') {
            formData.append(key, item[key]);
          }
        });

        const response = await projectAPI.submit(formData);
        results.push({ id: item.id, success: true, data: response.data });
        offlineQueue.remove(item.id);
      } catch (error) {
        results.push({ id: item.id, success: false, error: error.message });
      }
    }

    return results;
  },
};

export default api;
