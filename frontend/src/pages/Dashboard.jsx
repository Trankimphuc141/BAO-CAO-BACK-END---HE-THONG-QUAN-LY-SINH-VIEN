import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Dashboard({ currentUser }) {
  const [summary, setSummary] = useState({ gpa4: '0.0', credits: 0, attendance: '100%', thesis: 'Đang thực hiện' });
  const [announcements, setAnnouncements] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    // Announcements
    const annRes = await api.getAnnouncements();
    if (annRes.success && annRes.data) {
      setAnnouncements(annRes.data);
    }

    // Portal info & Thesis
    if (currentUser) {
      const [portalRes, thesisRes] = await Promise.all([
        api.getStudentPortalInfo(currentUser.id),
        api.getTheses()
      ]);

      if (portalRes.success && portalRes.academicSummary) {
        setSummary((prev) => ({
          ...prev,
          gpa4: portalRes.academicSummary.gpa4 || '0.0',
          credits: portalRes.academicSummary.passedCredits || 0
        }));
      }

      if (thesisRes.success && thesisRes.data && thesisRes.data.length > 0) {
        setSummary((prev) => ({ ...prev, thesis: thesisRes.data[0].status }));
      }
    }

    // Timetable for today
    const ttRes = await api.getTimetable();
    if (ttRes.success && ttRes.timetable) {
      const now = new Date();
      const currentDayNumber = now.getDay() === 0 ? 8 : now.getDay() + 1; // 2: T2 ... 7: T7
      const today = ttRes.timetable.filter((item) => item.dayOfWeek === currentDayNumber);
      setTodayClasses(today);
    }
  };

  return (
    <div>
      <div className="grid-cards">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Điểm Trung Bình (GPA Hệ 4)</span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
              <i className="fa-solid fa-award"></i>
            </div>
          </div>
          <div className="stat-value">{summary.gpa4} / 4.0</div>
          <div className="stat-desc">Điểm tích lũy học phần</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Số Tín Chỉ Tích Lũy</span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
          </div>
          <div className="stat-value">{summary.credits}</div>
          <div className="stat-desc">Tín chỉ đã hoàn thành</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Tỷ Lệ Tham Gia Học (Chuyên Cần)</span>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
              <i className="fa-solid fa-user-check"></i>
            </div>
          </div>
          <div className="stat-value">{summary.attendance}</div>
          <div className="stat-desc">Mức độ chuyên cần trên lớp</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Tiến Độ Nộp Luận Văn</span>
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
              <i className="fa-solid fa-file-arrow-up"></i>
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '16px', marginTop: '6px' }}>
            {summary.thesis}
          </div>
          <div className="stat-desc">Đồ án / Khóa luận tốt nghiệp</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel">
          <div className="panel-header">
            <h3>
              <i className="fa-solid fa-bullhorn"></i> Thông Báo Học Vụ & Giảng Viên Mới Nhất
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {announcements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                Không có thông báo mới
              </div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a._id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span
                      className={`badge ${
                        a.category === 'Khảo thí & Lịch thi'
                          ? 'badge-danger'
                          : a.category === 'Học bổng & Khen thưởng'
                          ? 'badge-warning'
                          : 'badge-purple'
                      }`}
                      style={{ fontSize: '10px' }}
                    >
                      {a.category}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                      <i className="fa-regular fa-clock"></i> {a.date}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '13.5px', color: 'var(--text-main)', marginBottom: '4px' }}>{a.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '6px' }}>
                    {a.content}
                  </p>
                  <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 500 }}>
                    <i className="fa-solid fa-user-tie"></i> {a.author || 'Giảng viên / Phòng Đào tạo'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <h3>
              <i className="fa-solid fa-calendar-check"></i> Lịch Học Hôm Nay & Các Ca Sắp Tới
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayClasses.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                Chưa có lịch học được ghi nhận
              </div>
            ) : (
              todayClasses.map((c) => (
                <div
                  key={c._id}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>
                      HÔM NAY • {c.shift}
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#60a5fa', fontWeight: 600 }}>
                      <i className="fa-solid fa-location-dot"></i> {c.room}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px' }}>{c.course?.name}</h4>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-user-tie"></i> GV: {c.teacher?.name || '-'} | Tiết {c.startPeriod || 1}-
                    {c.endPeriod || 3}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
