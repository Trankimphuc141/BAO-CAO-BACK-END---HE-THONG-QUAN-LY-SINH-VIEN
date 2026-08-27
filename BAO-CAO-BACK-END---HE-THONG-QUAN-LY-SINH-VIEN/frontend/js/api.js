// Front-end API Client Service
const API_BASE = '/api';

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
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
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
            return { success: false, message: 'Lỗi kết nối mạng hoặc máy chủ', error: error.message };
        }
    }

    // 1. Sinh viên Đăng nhập
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

    // Cập nhật ảnh đại diện sinh viên từ file máy tính
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

    // 2. Thời khóa biểu & Học phần
    async getTimetable(semester = '') {
        return await this.request(`/academic/timetable?semester=${semester}`);
    }

    async getClassSections() {
        return await this.request('/academic/class-sections');
    }

    async getAttendanceReport(classSectionId) {
        return await this.request(`/academic/attendance-report/${classSectionId}`);
    }

    // 3. Cổng thông tin sinh viên & Thông báo
    async getStudentPortalInfo(studentId = '') {
        const endpoint = studentId ? `/student/portal/${studentId}` : '/student/portal';
        return await this.request(endpoint);
    }

    async getAnnouncements() {
        return await this.request('/student/announcements');
    }

    async createAnnouncement(data) {
        return await this.request('/student/announcements', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async deleteAnnouncement(id) {
        return await this.request(`/student/announcements/${id}`, {
            method: 'DELETE'
        });
    }

    // 4. Báo cáo & Thống kê
    async getDashboardStatistics() {
        return await this.request('/reports/statistics');
    }

    // 5. Quản lý lịch thi & Xếp phòng thi
    async getExamSchedules(semester = '', date = '') {
        return await this.request(`/exams?semester=${semester}&date=${date}`);
    }

    // 6. Khảo sát & Đánh giá giảng dạy
    async getSurveys() {
        return await this.request('/surveys');
    }

    async submitSurveyResponse(surveyId, data) {
        return await this.request(`/surveys/${surveyId}/respond`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 7. Kiểm tra trùng lặp & Chống gian lận
    async getSubmissions() {
        return await this.request('/plagiarism');
    }

    async checkAndSubmitDocument(data) {
        return await this.request('/plagiarism/check', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 8. Quản lý thực tập & Việc làm
    async getInternships() {
        return await this.request('/internships');
    }

    async registerInternship(data) {
        return await this.request('/internships', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 9. Quản lý đồ án / Luận văn tốt nghiệp
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

window.api = new ApiService();
