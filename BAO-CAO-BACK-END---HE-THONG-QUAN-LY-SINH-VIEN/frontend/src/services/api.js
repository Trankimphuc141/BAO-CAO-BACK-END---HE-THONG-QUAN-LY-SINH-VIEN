// API Service for Frontend React
const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token') || '';
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  }

  setToken(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearToken() {
    this.token = '';
    this.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
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
      body: JSON.stringify({ code, password })
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
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
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

  // 3. Student Portal & Announcements
  async getStudentPortalInfo(studentId = '') {
    const endpoint = studentId ? `/student/portal/${studentId}` : '/student/portal';
    return await this.request(endpoint);
  }

  async getAnnouncements() {
    return await this.request('/student/announcements');
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

  async registerThesis(data) {
    return await this.request('/theses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export const api = new ApiService();
