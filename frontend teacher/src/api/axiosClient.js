import axios from 'axios';

/**
 * Standard Axios Client for Teacher Portal
 */
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor: Tự động đính kèm Token
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || localStorage.getItem('teacherToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Chuẩn hóa dữ liệu và bắt lỗi tập trung
axiosClient.interceptors.response.use(
    (response) => {
        // Trả về trực tiếp data sạch từ server
        return response.data;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('teacherToken');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
