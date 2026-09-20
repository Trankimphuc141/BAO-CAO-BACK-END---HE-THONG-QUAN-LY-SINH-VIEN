const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleRes = async (res) => {
  const data = await res.json();
  if (res.status === 401 || res.status === 403 || data.message === 'Token không hợp lệ hoặc đã hết hạn' || data.message === 'Không tìm thấy token hợp lệ') {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  return data;
};

export const api = {
  login: async (code, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password, role: 'admin' }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  getUsers: async (role, params = {}) => {
    try {
      const query = new URLSearchParams({ ...params });
      if (role) query.append('role', role);
      const res = await fetch(`${API_BASE}/admin/users?${query}`, {
        headers: getHeaders(),
      });
      return await handleRes(res);
    } catch (err) {
      console.error('getUsers error:', err);
      return { success: false, message: 'Lỗi khi tải danh sách', data: [] };
    }
  },

  getUserById: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        headers: getHeaders(),
      });
      return await handleRes(res);
    } catch (err) {
      console.error('getUserById error:', err);
      return { success: false, message: 'Lỗi khi tải thông tin chi tiết' };
    }
  },

  createUser: async (userData) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });
      return await handleRes(res);
    } catch (err) {
      console.error('createUser error:', err);
      return { success: false, message: 'Lỗi khi thêm người dùng' };
    }
  },

  updateUser: async (id, userData) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });
      return await handleRes(res);
    } catch (err) {
      console.error('updateUser error:', err);
      return { success: false, message: 'Lỗi khi cập nhật' };
    }
  },

  deleteUser: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return await handleRes(res);
    } catch (err) {
      console.error('deleteUser error:', err);
      return { success: false, message: 'Lỗi khi xóa người dùng' };
    }
  },

  // ═══════════════════════════════════════════
  // ACADEMIC MANAGEMENT (HỌC THUẬT)
  // ═══════════════════════════════════════════
  getMajors: async () => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/majors`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createMajor: async (data) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/majors`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  deleteMajor: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/majors/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  getCourses: async () => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/courses`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createCourse: async (data) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/courses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  deleteCourse: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/courses/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  getCurriculums: async () => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/curriculums`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createCurriculum: async (data) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/curriculums`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  toggleSemesterVisibility: async (curriculumId, semesterIndex, isVisible) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/curriculums/${curriculumId}/semesters/${semesterIndex}/visibility`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ isVisible })
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  addCourseToSemester: async (curriculumId, semesterIndex, courseId) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/curriculums/${curriculumId}/semesters/${semesterIndex}/courses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ courseId })
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  removeCourseFromSemester: async (curriculumId, semesterIndex, courseId) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/curriculums/${curriculumId}/semesters/${semesterIndex}/courses/${courseId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  getClassSections: async (semester) => {
    try {
      const q = semester ? `?semester=${encodeURIComponent(semester)}` : '';
      const res = await fetch(`${API_BASE}/academic-mgmt/sections${q}`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createClassSection: async (data) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/sections`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  updateClassSection: async (id, data) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/sections/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  deleteClassSection: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/academic-mgmt/sections/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  // ─── Lịch sử điểm danh (Admin) ───
  getAttendanceHistory: async (classSectionId) => {
    try {
      const res = await fetch(`${API_BASE}/academic/attendance-history/${classSectionId}`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, sessions: [] };
    }
  },

  getClassSectionsAll: async (semester = '') => {
    try {
      const q = semester ? `?semester=${encodeURIComponent(semester)}` : '';
      const res = await fetch(`${API_BASE}/academic-mgmt/sections${q}`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  unfinalizeAttendance: async (classSectionId, sessionNumber) => {
    try {
      const res = await fetch(`${API_BASE}/academic/attendance/unfinalize`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ classSectionId, sessionNumber })
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  adminEditAttendance: async (classSectionId, sessionNumber, date, records) => {
    try {
      const res = await fetch(`${API_BASE}/academic/attendance/admin-edit`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ classSectionId, sessionNumber, date, records })
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  // ─── Quản lý & Duyệt Điểm (Admin) ───
  getAdminGradeClasses: async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/grades/classes`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  getAdminClassGrades: async (classSectionId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/grades/classes/${classSectionId}`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  adminUpdateGrade: async (gradeId, gradeData) => {
    try {
      const res = await fetch(`${API_BASE}/admin/grades/${gradeId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(gradeData)
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  adminPublishGrades: async (classSectionId, note = '') => {
    try {
      const res = await fetch(`${API_BASE}/admin/grades/publish`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ classSectionId, note })
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  adminUnlockGrade: async (classSectionId, appealId = null, adminNote = '') => {
    try {
      const res = await fetch(`${API_BASE}/admin/grades/unlock`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ classSectionId, appealId, adminNote })
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  getAdminAppeals: async (status = '') => {
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await fetch(`${API_BASE}/admin/grades/appeals${q}`, { headers: getHeaders() });
      return await handleRes(res);
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  adminSyncSectionGrades: async (classSectionId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/grades/sync-section`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ classSectionId })
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  adminDecideAppeal: async (appealId, data) => {
    try {
      const res = await fetch(`${API_BASE}/admin/grades/appeals/${appealId}/decide`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  adminSyncAllGrades: async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/grades/sync-all`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  },

  // --- THÔNG BÁO ADMIN ---
  sendNotification: async (payload) => {
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi khi gửi thông báo: ' + err.message };
    }
  },

  getSentNotifications: async (params = {}) => {
    try {
      const query = new URLSearchParams(params);
      const res = await fetch(`${API_BASE}/admin/notifications?${query}`, {
        headers: getHeaders()
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi tải danh sách thông báo' };
    }
  },

  deleteNotification: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi xóa thông báo' };
    }
  },

  getNotificationTargets: async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/targets`, {
        headers: getHeaders()
      });
      return await handleRes(res);
    } catch (err) {
      return { success: false, message: 'Lỗi tải danh sách đối tượng' };
    }
  }
};

