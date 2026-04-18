import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wsip_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wsip_token');
      localStorage.removeItem('wsip_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Incident endpoints
export const incidentAPI = {
  report: (data) => api.post('/incidents', data),
  getAll: (params) => api.get('/incidents', { params }),
  getHeatmap: (params) => api.get('/incidents/heatmap', { params }),
};

// Map endpoints
export const mapAPI = {
  getAreas: (params) => api.get('/map/areas', { params }),
  getPoliceStations: (params) => api.get('/map/police-stations', { params }),
  getNearestStation: (params) => api.get('/map/nearest-station', { params }),
};

// Admin endpoints
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getIncidents: (params) => api.get('/admin/incidents', { params }),
  moderateIncident: (id, data) => api.patch(`/admin/incidents/${id}/moderate`, data),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUser: (id) => api.patch(`/admin/users/${id}/toggle`),
  recalculateScores: () => api.post('/admin/recalculate-scores'),
};

export default api;
