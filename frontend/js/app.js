// Front-end Student Portal Application Controller

class App {
    constructor() {
        this.activeTab = 'dashboard';
        this.currentUser = window.api.currentUser;
        this.classSections = [];
        this.weekOffset = 0;
        this.selectedShiftFilter = 'all';
        this.timetableCache = [];
    }

    async init() {
        this.setupNavigation();
        this.setupModals();
        this.setupAuth();
        this.setupStudentForms();
        this.startRealtimeClock();

        // Kiểm tra phiên đăng nhập hiện tại
        if (this.currentUser) {
            this.renderAuthState(true);
            await this.switchTab('dashboard');
        } else {
            this.renderAuthState(false);
            this.openAuthModal();
        }
    }

    // ==================== REAL-TIME DIGITAL CLOCK ====================

    startRealtimeClock() {
        const updateClock = () => {
            const now = new Date();
            const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            const dayName = days[now.getDay()];
            const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            
            const clockEl = document.getElementById('clock-text');
            if (clockEl) {
                clockEl.textContent = `${dayName}, ${dateStr} | ${timeStr}`;
            }
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = item.getAttribute('data-tab');
                if (tab) {
                    if (!this.currentUser && tab !== 'dashboard') {
                        this.openAuthModal();
                        return;
                    }
                    this.switchTab(tab);
                }
            });
        });
    }

    setupModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    // ==================== AUTHENTICATION (LOGIN ONLY) ====================

    setupAuth() {
        const formLogin = document.getElementById('form-login');
        if (formLogin) {
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = document.getElementById('login-code').value.trim();
                const password = document.getElementById('login-password').value.trim();

                const submitBtn = formLogin.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập...';
                submitBtn.disabled = true;

                const res = await window.api.login(code, password);

                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;

                if (res.success) {
                    this.currentUser = res.user;
                    this.renderAuthState(true);
                    this.closeModal('modal-auth');
                    formLogin.reset();
                    alert(`👋 Xin chào sinh viên ${res.user.name} (${res.user.code})!`);
                    await this.switchTab('dashboard');
                } else {
                    alert(`❌ Đăng nhập thất bại: ${res.message}`);
                }
            });
        }
    }

    openAuthModal() {
        this.openModal('modal-auth');
    }

    renderAuthState(isLoggedIn) {
        const userActions = document.getElementById('user-logged-in-actions');
        const guestActions = document.getElementById('user-guest-actions');
        const sidebarName = document.getElementById('sidebar-user-name');
        const headerCode = document.getElementById('header-student-code');
        const sidebarAvatar = document.getElementById('sidebar-avatar');

        if (isLoggedIn && this.currentUser) {
            userActions.style.display = 'flex';
            guestActions.style.display = 'none';
            sidebarName.textContent = this.currentUser.name;
            headerCode.textContent = `Mã SV: ${this.currentUser.code}`;
            if (this.currentUser.avatar) {
                sidebarAvatar.src = this.currentUser.avatar;
            }
        } else {
            userActions.style.display = 'none';
            guestActions.style.display = 'flex';
            sidebarName.textContent = 'Chưa đăng nhập';
            sidebarAvatar.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
        }
    }

    logout() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng Sinh Viên?')) {
            window.api.clearToken();
            this.currentUser = null;
            this.renderAuthState(false);
            this.openAuthModal();
        }
    }

    // ==================== AVATAR UPLOAD HANDLER ====================

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('❌ Kích thước ảnh quá lớn! Vui lòng chọn ảnh dung lượng dưới 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Image = e.target.result;

            const portalAvatar = document.getElementById('portal-avatar');
            const sidebarAvatar = document.getElementById('sidebar-avatar');
            if (portalAvatar) portalAvatar.src = base64Image;
            if (sidebarAvatar) sidebarAvatar.src = base64Image;

            if (this.currentUser) {
                const res = await window.api.updateAvatar(base64Image, this.currentUser.id);
                if (res.success) {
                    this.currentUser.avatar = res.avatar || base64Image;
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    alert('📸 Cập nhật ảnh đại diện thành công!');
                } else {
                    alert(`❌ Lỗi cập nhật ảnh: ${res.message}`);
                }
            }
        };

        reader.readAsDataURL(file);
    }

    // ==================== ANNOUNCEMENTS (READ-ONLY) ====================

    async loadAnnouncements() {
        const res = await window.api.getAnnouncements();
        const dashList = document.getElementById('dash-announcements-list');
        const portalList = document.getElementById('portal-announcements-list');

        if (res.success && res.data && res.data.length > 0) {
            const html = res.data.map(a => `
                <div style="padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span class="badge ${a.category === 'Khảo thí & Lịch thi' ? 'badge-danger' : a.category === 'Học bổng & Khen thưởng' ? 'badge-warning' : 'badge-purple'}" style="font-size: 10px;">
                            ${a.category}
                        </span>
                        <span style="font-size: 11px; color: var(--text-light);"><i class="fa-regular fa-clock"></i> ${a.date}</span>
                    </div>
                    <h4 style="font-size: 13.5px; color: #fff; margin-bottom: 4px;">${a.title}</h4>
                    <p style="font-size: 12px; color: var(--text-muted); line-height: 1.45; margin-bottom: 6px;">${a.content}</p>
                    <div style="font-size: 11px; color: #60a5fa; font-weight: 500;">
                        <i class="fa-solid fa-user-tie"></i> ${a.author || 'Giảng viên / Phòng Đào tạo'}
                    </div>
                </div>
            `).join('');

            if (dashList) dashList.innerHTML = html;
            if (portalList) portalList.innerHTML = html;
        } else {
            const emptyHtml = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">Không có thông báo mới</div>';
            if (dashList) dashList.innerHTML = emptyHtml;
            if (portalList) portalList.innerHTML = emptyHtml;
        }
    }

    // ==================== REAL-TIME TIMETABLE ENGINE ====================

    getDatesOfWeek(offset = 0) {
        const now = new Date();
        const currentDay = now.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday + (offset * 7));

        const days = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const isToday = d.toDateString() === now.toDateString();
            days.push({
                dayOfWeekNumber: i + 2,
                dayName: i === 0 ? 'Thứ Hai' : i === 1 ? 'Thứ Ba' : i === 2 ? 'Thứ Tư' : i === 3 ? 'Thứ Năm' : i === 4 ? 'Thứ Sáu' : 'Thứ Bảy',
                dateStr: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                shortDate: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                isToday
            });
        }
        return days;
    }

    changeWeek(step) {
        this.weekOffset += step;
        this.renderTimetableGrid();
    }

    resetToCurrentWeek() {
        this.weekOffset = 0;
        this.renderTimetableGrid();
    }

    filterShifts(type) {
        this.selectedShiftFilter = type;
        document.querySelectorAll('.shift-filter-btn').forEach(btn => {
            if (btn.getAttribute('data-shift-filter') === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        this.renderTimetableGrid();
    }

    async loadTimetable() {
        const res = await window.api.getTimetable();
        if (res.success && res.timetable && res.timetable.length > 0) {
            this.timetableCache = res.timetable.map(item => {
                let sessionType = 'sang';
                if (item.shift && (item.shift.includes('13:') || item.shift.includes('14:') || item.shift.includes('15:') || item.shift.includes('16:'))) {
                    sessionType = 'chieu';
                } else if (item.shift && (item.shift.includes('18:') || item.shift.includes('19:') || item.shift.includes('20:'))) {
                    sessionType = 'toi';
                }
                return { ...item, sessionType };
            });
        } else {
            this.timetableCache = [];
        }

        this.renderTimetableGrid();
        this.renderUpcomingClasses();
    }

    renderTimetableGrid() {
        const weekDays = this.getDatesOfWeek(this.weekOffset);
        const grid = document.getElementById('timetable-grid');
        const weekLabel = document.getElementById('current-week-label');

        if (weekLabel) {
            const startStr = weekDays[0].shortDate;
            const endStr = weekDays[5].dateStr;
            const prefix = this.weekOffset === 0 ? 'Tuần này' : this.weekOffset > 0 ? `+${this.weekOffset} tuần` : `${this.weekOffset} tuần`;
            weekLabel.textContent = `${prefix} (${startStr} - ${endStr})`;
        }

        if (!grid) return;

        grid.innerHTML = weekDays.map(day => {
            let dayItems = this.timetableCache.filter(item => item.dayOfWeek === day.dayOfWeekNumber);

            if (this.selectedShiftFilter !== 'all') {
                dayItems = dayItems.filter(item => item.sessionType === this.selectedShiftFilter);
            }

            return `
                <div class="schedule-day-column ${day.isToday ? 'is-today' : ''}">
                    <div class="schedule-day-header">
                        <div class="schedule-day-name">${day.dayName}</div>
                        <div class="schedule-day-date">${day.dateStr}</div>
                    </div>

                    ${dayItems.length === 0 ? 
                        `<div style="font-size: 11.5px; color: var(--text-light); text-align: center; margin-top: 40px;">
                            <i class="fa-regular fa-calendar-xmark" style="font-size: 22px; margin-bottom: 6px; display: block; opacity: 0.35;"></i>
                            Không có ca học
                         </div>` : 
                        dayItems.map(s => {
                            const sessionClass = s.sessionType === 'sang' ? 'session-sang' : s.sessionType === 'chieu' ? 'session-chieu' : 'session-toi';
                            const badgeClass = s.sessionType === 'sang' ? 'shift-sang' : s.sessionType === 'chieu' ? 'shift-chieu' : 'shift-toi';
                            const sessionName = s.sessionType === 'sang' ? '🌅 Sáng' : s.sessionType === 'chieu' ? '☀️ Chiều' : '🌙 Tối';

                            return `
                                <div class="schedule-card ${sessionClass}">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                        <span class="schedule-shift-badge ${badgeClass}">
                                            ${sessionName} • ${s.shift}
                                        </span>
                                    </div>
                                    <div class="schedule-course-title">${s.course?.name || 'Môn học'}</div>
                                    
                                    <div class="schedule-meta-item">
                                        <i class="fa-solid fa-layer-group"></i> Mã HP: <strong style="color: #93c5fd;">${s.sectionCode || s.course?.code}</strong>
                                    </div>
                                    <div class="schedule-meta-item">
                                        <i class="fa-solid fa-location-dot"></i> Phòng: <strong>${s.room}</strong>
                                    </div>
                                    <div class="schedule-meta-item">
                                        <i class="fa-solid fa-user-tie"></i> GV: ${s.teacher?.name || 'Giảng viên phụ trách'}
                                    </div>
                                    <div class="schedule-meta-item" style="color: #34d399; font-size: 10.5px;">
                                        <i class="fa-solid fa-circle-check"></i> Tiết ${s.startPeriod || 1} - ${s.endPeriod || 3} (${s.course?.credits || 3} TC)
                                    </div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            `;
        }).join('');
    }

    renderUpcomingClasses() {
        const upcomingContainer = document.getElementById('dash-upcoming-classes');
        if (!upcomingContainer) return;

        const now = new Date();
        const currentDayNumber = now.getDay() === 0 ? 8 : now.getDay() + 1;

        const todayClasses = this.timetableCache.filter(item => item.dayOfWeek === currentDayNumber);

        if (todayClasses.length > 0) {
            upcomingContainer.innerHTML = todayClasses.map(c => `
                <div style="padding: 12px 14px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span class="badge badge-info" style="font-size: 10px;">HÔM NAY • ${c.shift}</span>
                        <span style="font-size: 11.5px; color: #60a5fa; font-weight: 600;"><i class="fa-solid fa-location-dot"></i> ${c.room}</span>
                    </div>
                    <h4 style="font-size: 13px; color: #fff; margin-bottom: 4px;">${c.course?.name}</h4>
                    <div style="font-size: 11px; color: var(--text-muted);">
                        <i class="fa-solid fa-user-tie"></i> GV: ${c.teacher?.name || '-'} | Tiết ${c.startPeriod || 1}-${c.endPeriod || 3}
                    </div>
                </div>
            `).join('');
        } else {
            upcomingContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">Chưa có lịch học được ghi nhận</div>';
        }
    }

    // ==================== TAB NAVIGATION & DATA RENDERING ====================

    async switchTab(tabId) {
        this.activeTab = tabId;

        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            if (panel.id === `tab-${tabId}`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        const titles = {
            dashboard: { title: 'Tổng Quan Học Tập', sub: 'Cổng tra cứu kết quả học vụ, thời khóa biểu và nộp luận văn', icon: 'fa-chart-pie' },
            portal: { title: 'Hồ Sơ & Bảng Điểm', sub: 'Hồ sơ sinh viên, bảng điểm chi tiết các học kỳ, điểm GPA/CPA', icon: 'fa-id-card' },
            timetable: { title: 'Lịch Học Cá Nhân Theo Thời Gian Thực', sub: 'Thời khóa biểu học tập với ngày tháng chạy theo thời gian thực, phân chia Buổi & Ca học', icon: 'fa-calendar-days' },
            attendance: { title: 'Theo Dõi Chuyên Cần', sub: 'Giám sát số buổi học và cảnh báo nguy cơ cấm thi vắng > 20%', icon: 'fa-clipboard-user' },
            exams: { title: 'Lịch Thi Cá Nhân', sub: 'Tra cứu ngày thi, ca thi, phòng thi và hình thức thi', icon: 'fa-pen-ruler' },
            survey: { title: 'Đánh Giá Giảng Dạy', sub: 'Khảo sát chất lượng môn học và giảng viên ẩn danh', icon: 'fa-star-half-stroke' },
            thesis: { title: 'Nộp Đồ Án / Luận Văn Tốt Nghiệp', sub: 'Nộp file báo cáo đề tài tốt nghiệp và theo dõi các mốc tiến độ M1-M4', icon: 'fa-file-arrow-up' }
        };

        const info = titles[tabId] || titles.dashboard;
        document.getElementById('page-title').innerHTML = `<i class="fa-solid ${info.icon}"></i> ${info.title}`;
        document.getElementById('page-subtitle').textContent = info.sub;

        switch (tabId) {
            case 'dashboard': await this.loadDashboard(); break;
            case 'portal': await this.loadPortal(); break;
            case 'timetable': await this.loadTimetable(); break;
            case 'attendance': await this.loadAttendance(); break;
            case 'exams': await this.loadExams(); break;
            case 'survey': await this.loadSurveys(); break;
            case 'thesis': await this.loadTheses(); break;
        }
    }

    // 1. DASHBOARD
    async loadDashboard() {
        await this.loadAnnouncements();
        await this.loadTimetable();

        if (this.currentUser) {
            const studentId = this.currentUser.id;
            const [portalRes, thesisRes] = await Promise.all([
                window.api.getStudentPortalInfo(studentId),
                window.api.getTheses()
            ]);

            if (portalRes.success) {
                const { academicSummary } = portalRes;
                document.getElementById('dash-gpa4').textContent = `${academicSummary.gpa4} / 4.0`;
                document.getElementById('dash-credits').textContent = `${academicSummary.passedCredits || 0} TC`;
            }

            if (thesisRes.success && thesisRes.data && thesisRes.data.length > 0) {
                document.getElementById('dash-thesis-status').textContent = thesisRes.data[0].status;
            }
        }
    }

    // 2. PORTAL
    async loadPortal() {
        await this.loadAnnouncements();
        if (!this.currentUser) return;

        const res = await window.api.getStudentPortalInfo(this.currentUser.id);
        if (res.success) {
            const { student, academicSummary, grades } = res;
            document.getElementById('portal-avatar').src = student.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
            document.getElementById('portal-name').textContent = student.name;
            document.getElementById('portal-code').textContent = `Mã SV: ${student.code}`;
            document.getElementById('portal-dept').textContent = student.department || '-';
            document.getElementById('portal-major').textContent = student.major || '-';
            document.getElementById('portal-class').textContent = student.classCode || '-';
            document.getElementById('portal-email').textContent = student.email || '-';
            document.getElementById('portal-year').textContent = student.academicYear || '-';

            document.getElementById('portal-gpa4').textContent = `${academicSummary.gpa4} / 4.0`;
            document.getElementById('portal-gpa10').textContent = `${academicSummary.gpa10} / 10.0`;
            document.getElementById('portal-standing').textContent = academicSummary.academicStanding;

            const tbody = document.getElementById('portal-grades-tbody');
            if (grades.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">Chưa có dữ liệu bảng điểm</td></tr>';
            } else {
                tbody.innerHTML = grades.map(g => `
                    <tr>
                        <td><strong>${g.course?.code || '-'}</strong></td>
                        <td>${g.course?.name || '-'}</td>
                        <td>${g.course?.credits || 3}</td>
                        <td>${g.attendanceScore}</td>
                        <td>${g.midtermScore}</td>
                        <td>${g.finalScore}</td>
                        <td><strong style="color: #60a5fa;">${g.totalScore10}</strong></td>
                        <td><span class="badge ${g.letterGrade === 'F' ? 'badge-danger' : 'badge-info'}">${g.letterGrade}</span></td>
                        <td>
                            <span class="badge ${g.isPassed ? 'badge-success' : 'badge-danger'}">
                                ${g.isPassed ? '<i class="fa-solid fa-check"></i> Đạt' : '<i class="fa-solid fa-xmark"></i> Học lại'}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    // 4. ATTENDANCE
    async loadAttendance() {
        const secRes = await window.api.getClassSections();
        if (secRes.success && secRes.data) {
            const tbody = document.getElementById('attendance-tbody');
            const rows = [];
            for (const section of secRes.data) {
                const repRes = await window.api.getAttendanceReport(section._id);
                if (repRes.success && repRes.studentStats) {
                    const myStat = repRes.studentStats.find(s => s.student._id.toString() === (this.currentUser?.id || ''));
                    if (myStat) {
                        rows.push(`
                            <tr>
                                <td><code>${section.sectionCode}</code></td>
                                <td><strong>${section.course?.name}</strong></td>
                                <td><span style="color: #34d399; font-weight: 600;">${myStat.presentCount}</span></td>
                                <td><span style="color: #fbbf24;">${myStat.lateCount}</span></td>
                                <td>${myStat.excusedCount}</td>
                                <td><span style="color: #f87171; font-weight: 600;">${myStat.unexcusedCount}</span></td>
                                <td><strong>${myStat.absencePercentage}%</strong></td>
                                <td>
                                    <span class="badge ${myStat.isBannedFromExam ? 'badge-danger' : 'badge-success'}">
                                        ${myStat.isBannedFromExam ? '<i class="fa-solid fa-triangle-exclamation"></i> CẤM THI (>20%)' : '<i class="fa-solid fa-circle-check"></i> Đủ điều kiện'}
                                    </span>
                                </td>
                            </tr>
                        `);
                    }
                }
            }
            tbody.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Chưa có dữ liệu chuyên cần</td></tr>';
        }
    }

    // 5. EXAMS
    async loadExams() {
        const res = await window.api.getExamSchedules();
        if (res.success) {
            const tbody = document.getElementById('exams-tbody');
            if (res.data && res.data.length > 0) {
                tbody.innerHTML = res.data.map(e => `
                    <tr>
                        <td><strong>${e.course?.name}</strong> (${e.course?.code})</td>
                        <td>${e.classSection?.sectionCode || 'Chung'}</td>
                        <td><i class="fa-regular fa-calendar"></i> ${e.examDate}</td>
                        <td><i class="fa-regular fa-clock"></i> ${e.startTime} - ${e.endTime}</td>
                        <td><strong style="color: #60a5fa;">${e.room}</strong></td>
                        <td><span class="badge badge-info">${e.format}</span></td>
                        <td><span class="badge badge-success">${e.status}</span></td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Chưa có lịch thi</td></tr>';
            }
        }
    }

    // 6. SURVEYS
    async loadSurveys() {
        const res = await window.api.getSurveys();
        if (res.success) {
            const container = document.getElementById('survey-cards-container');
            if (res.data && res.data.length > 0) {
                container.innerHTML = res.data.map(s => `
                    <div class="stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span class="badge badge-purple">${s.course?.code}</span>
                                <span class="badge ${s.isOpen ? 'badge-success' : 'badge-danger'}">${s.isOpen ? 'Đang mở' : 'Đã đóng'}</span>
                            </div>
                            <h3 style="font-size: 14px; color: #fff; margin-bottom: 8px;">${s.title}</h3>
                            <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 12px;">
                                <i class="fa-solid fa-chalkboard-user"></i> Giảng viên: <strong>${s.teacher?.name}</strong>
                            </p>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="window.app.openSurveyModal('${s._id}', '${s.title}')">
                            <i class="fa-solid fa-star"></i> Làm Đánh Giá Môn Học (Ẩn danh)
                        </button>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; grid-column: 1/-1; text-align: center; padding: 20px 0;">Không có phiếu khảo sát nào đang mở</div>';
            }
        }
    }

    openSurveyModal(surveyId, surveyTitle) {
        document.getElementById('survey-target-id').value = surveyId;
        document.getElementById('survey-modal-title').textContent = surveyTitle;
        this.openModal('modal-submit-survey');
    }

    // 7. SINH VIÊN: NỘP ĐỒ ÁN / LUẬN VĂN
    async loadTheses() {
        const res = await window.api.getTheses();
        if (res.success) {
            const tbody = document.getElementById('thesis-tbody');
            if (res.data && res.data.length > 0) {
                tbody.innerHTML = res.data.map(t => `
                    <tr>
                        <td><code>${t.topicCode}</code></td>
                        <td><strong>${t.topicTitle}</strong></td>
                        <td>
                            <div style="display: flex; gap: 5px;">
                                ${(t.milestones || []).map((m, idx) => `
                                    <span class="badge ${m.status === 'Đã duyệt' ? 'badge-success' : m.status === 'Đã nộp' ? 'badge-info' : 'badge-secondary'}" 
                                          title="${m.name}: ${m.status}" style="font-size: 10px; padding: 2px 7px;">
                                        M${idx + 1} (${m.status})
                                    </span>
                                `).join('')}
                            </div>
                        </td>
                        <td><small>${t.defenseDate || '-'}</small><br><small style="color: #60a5fa;">${t.defenseRoom || ''}</small></td>
                        <td><span class="badge badge-success">${t.status}</span></td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Chưa đăng ký đề tài tốt nghiệp</td></tr>';
            }
        }
    }

    // ==================== FORM SUBMISSIONS ====================

    setupStudentForms() {
        // Form Khảo sát (Sinh viên)
        const surveyForm = document.getElementById('form-submit-survey');
        if (surveyForm) {
            surveyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const surveyId = document.getElementById('survey-target-id').value;
                const teachingMethodRating = document.getElementById('survey-rating-teaching').value;
                const knowledgeRating = document.getElementById('survey-rating-knowledge').value;
                const punctualityRating = document.getElementById('survey-rating-punctuality').value;
                const fairnessRating = document.getElementById('survey-rating-fairness').value;
                const feedback = document.getElementById('survey-feedback').value;

                const res = await window.api.submitSurveyResponse(surveyId, {
                    teachingMethodRating,
                    knowledgeRating,
                    punctualityRating,
                    fairnessRating,
                    feedback,
                    isAnonymous: true
                });

                if (res.success) {
                    alert('✅ Đã gửi ý kiến đánh giá ẩn danh thành công!');
                    this.closeModal('modal-submit-survey');
                    await this.loadSurveys();
                } else {
                    alert(`❌ Lỗi: ${res.message}`);
                }
            });
        }

        // Form Nộp Đồ Án / Luận Văn (Sinh viên)
        const thesisForm = document.getElementById('form-create-thesis');
        if (thesisForm) {
            thesisForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.currentUser) return this.openAuthModal();

                const topicTitle = document.getElementById('thesis-title').value.trim();
                const milestone = document.getElementById('thesis-milestone').value;
                const description = document.getElementById('thesis-desc').value.trim();
                const fileInput = document.getElementById('thesis-file-input');
                const fileName = fileInput.files.length > 0 ? fileInput.files[0].name : 'BaoCao_LuanVan.pdf';

                const res = await window.api.registerThesis({
                    topicTitle,
                    description: `[${milestone} - File: ${fileName}] ${description}`,
                    studentId: this.currentUser.id
                });

                if (res.success) {
                    alert(`✅ Nộp báo cáo đồ án / luận văn thành công (${milestone})! Giảng viên hướng dẫn sẽ tiến hành duyệt.`);
                    thesisForm.reset();
                    await this.loadTheses();
                } else {
                    alert(`❌ Lỗi: ${res.message}`);
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
