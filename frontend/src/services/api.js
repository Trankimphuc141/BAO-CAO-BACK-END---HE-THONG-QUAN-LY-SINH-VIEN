// API Service for Frontend React
const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  constructor() {
    this.token = sessionStorage.getItem('token') || '';
    this.currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
  }

  setToken(token, user) {
    this.token = token;
    this.currentUser = user;
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearToken() {
    this.token = '';
    this.currentUser = null;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('currentUser');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });
      const data = await response.json();
      if (response.status === 401 || response.status === 403 || data.message === 'Token không hợp lệ hoặc đã hết hạn') {
        this.clearToken();
      }
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      return { success: false, message: 'Lỗi kết nối máy chủ', error: error.message };
    }
  }

  // 1. Auth & Profile
  async login(code, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ code, password, role: 'student' })
    });
    if (res.success && res.token) {
      this.setToken(res.token, res.user);
    }
    return res;
  }

  async getProfile() {
    return await this.request('/auth/profile');
  }

  async updateAvatar(avatarData, studentId = '') {
    const res = await this.request('/auth/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatar: avatarData, studentId })
    });
    if (res.success && res.avatar && this.currentUser) {
      this.currentUser.avatar = res.avatar;
      sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
    return res;
  }

  // 2. Timetable & Sections
  async getTimetable(semester = '') {
    return await this.request(`/academic/timetable?semester=${semester}`);
  }

  async getClassSections() {
    return await this.request('/academic/class-sections');
  }

  async getAttendanceReport(classSectionId) {
    return await this.request(`/academic/attendance-report/${classSectionId}`);
  }

  async qrCheckIn(qrToken) {
    return await this.request('/academic/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ qrToken })
    });
  }

  // 3. Student Portal & Announcements
  async getStudentPortalInfo(studentId = '') {
    const endpoint = studentId ? `/student/portal/${studentId}` : '/student/portal';
    return await this.request(endpoint);
  }

  async getAnnouncements() {
    return await this.request('/student/announcements');
  }

  async getNotifications() {
    return await this.request('/student/notifications');
  }

  async markNotificationRead(id) {
    return await this.request(`/student/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return await this.request('/student/notifications/read-all', {
      method: 'PUT'
    });
  }

  // 4. Exams
  async getExamSchedules(semester = '', date = '') {
    return await this.request(`/exams?semester=${semester}&date=${date}`);
  }

  // 5. Surveys
  async getSurveys() {
    return await this.request('/surveys');
  }

  async submitSurveyResponse(surveyId, data) {
    return await this.request(`/surveys/${surveyId}/respond`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 6. Thesis
  async getTheses() {
    return await this.request('/theses');
  }

  async getAdvisors() {
    return await this.request('/theses/advisors');
  }

  async registerThesis(data) {
    return await this.request('/theses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 7. Academic Management & Course Registration
  async getCurriculumView() {
    return await this.request('/academic-mgmt/student/curriculum');
  }

  async getAvailableSections(semester = '') {
    const q = semester ? `?semester=${encodeURIComponent(semester)}` : '';
    return await this.request(`/academic-mgmt/registration/available${q}`);
  }

  async registerSection(classSectionId) {
    return await this.request('/academic-mgmt/registration/register', {
      method: 'POST',
      body: JSON.stringify({ classSectionId })
    });
  }

  async dropSection(classSectionId) {
    return await this.request('/academic-mgmt/registration/drop', {
      method: 'POST',
      body: JSON.stringify({ classSectionId })
    });
  }

  async getMyRegisteredSections(semester = '') {
    const q = semester ? `?semester=${encodeURIComponent(semester)}` : '';
    return await this.request(`/academic-mgmt/registration/my-courses${q}`);
  }
}

export const api = new ApiService();
