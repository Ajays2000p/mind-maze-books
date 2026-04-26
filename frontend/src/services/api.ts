import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const ML_BASE_URL = import.meta.env.VITE_ML_BASE_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add JWT to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
};

export const bookApi = {
    getAll: (params: any) => api.get('/books', { params }),
    getById: (id: string) => api.get(`/books/${id}`),
    getRecommendedSection: () => api.get('/recommended/section'),
    getPersonalizedRecommendations: () => api.get('/books/personalized-recommendations'),
    generateCover: (id: string) => api.post(`/books/${id}/generate-cover`),
    create: (data: any) => api.post('/books', data),
    update: (id: string, data: any) => api.put(`/books/${id}`, data),
    delete: (id: string) => api.delete(`/books/${id}`),
    search: (query: string) => api.get(`/books/search?query=${encodeURIComponent(query)}`),
};

export const ratingApi = {
    submit: (bookId: string, value: number) => api.post('/ratings', { bookId, value }),
    getUserRating: (bookId: string) => api.get(`/ratings/${bookId}`),
};

export const userApi = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data: any) => api.put('/users/profile', data),
};

export const adminApi = {
    getStats: () => api.get('/admin/stats'),
    getUsers: () => api.get('/admin/users'),
    deleteRating: (id: string) => api.delete(`/admin/ratings/${id}`),
};

export const rankingApi = {
    getTopRated: (params?: any) => api.get('/rankings/top-rated', { params }),
};

export const mlApi = {
    getPopular: (limit = 10, params = {}) => axios.get(`${ML_BASE_URL}/recommend/popularity`, { params: { limit, ...params } }),
    getSimilar: (bookId: string, params = {}) => axios.get(`${ML_BASE_URL}/recommend/content`, { params: { bookId, ...params } }),
    getCollaborative: (userId: string, params = {}) => axios.get(`${ML_BASE_URL}/recommend/collaborative`, { params: { userId, ...params } }),
    getPersonalized: (userId: string) => axios.get(`${ML_BASE_URL}/recommend/user/${userId}`),
    getRecommendations: (userId?: string) => axios.get(`${ML_BASE_URL}/recommendations`, { params: { userId } }),
};



export default api;
