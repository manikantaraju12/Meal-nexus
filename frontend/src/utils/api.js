import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyLoginOtp: (data) => api.post('/auth/verify-login-otp', data),
  getMe: () => api.get('/auth/me'),
};

// OTP API
export const otpAPI = {
  send: (data) => api.post('/otp/send', data),
  verify: (data) => api.post('/otp/verify', data),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getVolunteers: () => api.get('/users/volunteers'),
  getNGOs: () => api.get('/users/ngos'),
};

// Donation API
export const donationAPI = {
  create: (data) => api.post('/donations', data),
  getAll: (params) => api.get('/donations', { params }),
  accept: (id) => api.put(`/donations/${id}/accept`),
  assignVolunteer: (id, volunteerId) => api.put(`/donations/${id}/assign-volunteer`, { volunteerId }),
  updateStatus: (id, data) => api.put(`/donations/${id}/status`, data),
};

// Task API
export const taskAPI = {
  getAll: () => api.get('/tasks'),
  create: (data) => api.post('/tasks', data),
  start: (id) => api.put(`/tasks/${id}/start`),
  complete: (id, data) => api.put(`/tasks/${id}/complete`, data),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  verifyUser: (id) => api.put(`/admin/users/${id}/verify`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getDonations: () => api.get('/admin/donations'),
  getTasks: (status) => api.get('/admin/tasks', { params: status ? { status } : {} }),
};

// Campaign API
export const campaignAPI = {
  getAll: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),

};

// Notification API
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Upload API
export const uploadAPI = {
  getPresignedUrl: (filename, contentType) =>
    api.get(`/upload/presigned-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`),
};

// AI Ranking API
export const aiAPI = {
  rankCandidates: (donation, candidates, candidateType, topN = 3) => {
    const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:3000';
    return fetch(`${AI_API_URL}/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donation, candidates, candidateType, topN })
    }).then(res => res.json());
  }
};

export default api;
