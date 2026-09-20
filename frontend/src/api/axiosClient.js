/**
 * Standard Axios Client for Student Frontend Portal
 */
const getAuthToken = () => {
    return sessionStorage.getItem('token') || localStorage.getItem('token') || '';
};

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiClient(endpoint, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const token = getAuthToken();
    
    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    };

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        const contentType = response.headers.get('content-type');
        let data = null;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (response.status === 401) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('token');
        }

        return {
            status: response.status,
            ok: response.ok,
            data
        };
    } catch (err) {
        console.error('API Client Network Error:', err);
        throw err;
    }
}

export default apiClient;
