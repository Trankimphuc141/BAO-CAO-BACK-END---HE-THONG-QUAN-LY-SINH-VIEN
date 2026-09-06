const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = {
  login: async (code, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },
  
  // Các hàm API khác sẽ thêm sau
};
