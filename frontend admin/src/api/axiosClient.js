import axios from 'axios';

/**
 * Standard Axios Client for Admin Portal
 */
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
axiosClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('token');
            localStorage.removeItem('adminUser');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
