import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

// Events API
export const eventsAPI = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
  getStats: (id) => api.get(`/events/${id}/stats`),
};

// Trading API
export const tradingAPI = {
  getOrderBook: (eventId) => api.get(`/trading/orderbook/${eventId}`),
  getTrades: (eventId) => api.get(`/trading/trades/${eventId}`),
  getPositions: (eventId) => api.get(`/trading/positions/${eventId}`),
  placeOrder: (orderData) => api.post('/trading/order', orderData),
  closePosition: (positionId) => api.post(`/trading/close-position/${positionId}`),
  getLimits: () => api.get('/trading/limits'),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  getEvents: () => api.get('/admin/events'),
  updateEvent: (eventId, data) => api.put(`/admin/events/${eventId}`, data),
  getRiskReport: () => api.get('/admin/risk-report'),
};

export default api;
