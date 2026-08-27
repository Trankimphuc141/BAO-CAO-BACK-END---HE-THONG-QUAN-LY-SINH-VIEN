import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function TimetablePage() {
  const [timetable, setTimetable] = useState([]);
  const [clockText, setClockText] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [shiftFilter, setShiftFilter] = useState('all');

  useEffect(() => {
    loadTimetable();

    const updateClock = () => {
      const now = new Date();
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[now.getDay()];
      const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setClockText(`${dayName}, ${dateStr} | ${timeStr}`);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTimetable = async () => {
    const res = await api.getTimetable();
    if (res.success && res.timetable) {
      const enriched = res.timetable.map((item) => {
        let sessionType = 'sang';
        if (
          item.shift &&
          (item.shift.includes('13:') || item.shift.includes('14:') || item.shift.includes('15:') || item.shift.includes('16:'))
        ) {
          sessionType = 'chieu';
        } else if (
          item.shift &&
          (item.shift.includes('18:') || item.shift.includes('19:') || item.shift.includes('20:'))
        ) {
          sessionType = 'toi';
        }
        return { ...item, sessionType };
      });
      setTimetable(enriched);
    } else {
      setTimetable([]);
    }
  };

  const getDatesOfWeek = (offset = 0) => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + offset * 7);

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
  };

  const weekDays = getDatesOfWeek(weekOffset);
  const weekLabel = `${weekOffset === 0 ? 'Tuần này' : weekOffset > 0 ? `+${weekOffset} tuần` : `${weekOffset} tuần`} (${weekDays[0].shortDate} - ${weekDays[5].dateStr})`;

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h3>
          <i className="fa-solid fa-calendar-week"></i> Thời Khóa Biểu Học Tập Theo Thời Gian Thực
        </h3>
        <button className="btn btn-secondary btn-sm" onClick={loadTimetable}>
          <i className="fa-solid fa-rotate"></i> Làm mới
        </button>
      </div>

      <div className="timetable-topbar">
        <div className="realtime-clock-badge">
          <i className="fa-solid fa-clock"></i> <span>{clockText || 'Đang tải thời gian...'}</span>
        </div>

        <div className="week-navigator">
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset((prev) => prev - 1)}>
            <i className="fa-solid fa-chevron-left"></i> Tuần Trước
          </button>
          <span className="week-display-label">{weekLabel}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset((prev) => prev + 1)}>
            Tuần Sau <i className="fa-solid fa-chevron-right"></i>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setWeekOffset(0)} style={{ marginLeft: '4px' }}>
            <i className="fa-solid fa-calendar-day"></i> Về Tuần Này
          </button>
        </div>

        <div className="shift-filter-group">
          <button
            className={`shift-filter-btn ${shiftFilter === 'all' ? 'active' : ''}`}
            onClick={() => setShiftFilter('all')}
          >
            <i className="fa-solid fa-list-check"></i> Tất cả các ca
          </button>
          <button
            className={`shift-filter-btn ${shiftFilter === 'sang' ? 'active' : ''}`}
            onClick={() => setShiftFilter('sang')}
          >
            <i className="fa-solid fa-sun" style={{ color: '#60a5fa' }}></i> Buổi Sáng (Ca 1, 2)
          </button>
          <button
            className={`shift-filter-btn ${shiftFilter === 'chieu' ? 'active' : ''}`}
            onClick={() => setShiftFilter('chieu')}
          >
            <i className="fa-solid fa-cloud-sun" style={{ color: '#fbbf24' }}></i> Buổi Chiều (Ca 3, 4)
          </button>
          <button
            className={`shift-filter-btn ${shiftFilter === 'toi' ? 'active' : ''}`}
            onClick={() => setShiftFilter('toi')}
          >
            <i className="fa-solid fa-moon" style={{ color: '#c084fc' }}></i> Buổi Tối (Ca 5)
          </button>
        </div>
      </div>

      <div className="schedule-grid">
        {weekDays.map((day) => {
          let dayItems = timetable.filter((item) => item.dayOfWeek === day.dayOfWeekNumber);
          if (shiftFilter !== 'all') {
            dayItems = dayItems.filter((item) => item.sessionType === shiftFilter);
          }

          return (
            <div key={day.dayOfWeekNumber} className={`schedule-day-column ${day.isToday ? 'is-today' : ''}`}>
              <div className="schedule-day-header">
                <div className="schedule-day-name">{day.dayName}</div>
                <div className="schedule-day-date">{day.dateStr}</div>
              </div>

              {dayItems.length === 0 ? (
                <div style={{ fontSize: '11.5px', color: 'var(--text-light)', textAlign: 'center', marginTop: '40px' }}>
                  <i
                    className="fa-regular fa-calendar-xmark"
                    style={{ fontSize: '22px', marginBottom: '6px', display: 'block', opacity: 0.35 }}
                  ></i>
                  Không có ca học
                </div>
              ) : (
                dayItems.map((s) => {
                  const sessionClass =
                    s.sessionType === 'sang'
                      ? 'session-sang'
                      : s.sessionType === 'chieu'
                      ? 'session-chieu'
                      : 'session-toi';
                  const badgeClass =
                    s.sessionType === 'sang'
                      ? 'shift-sang'
                      : s.sessionType === 'chieu'
                      ? 'shift-chieu'
                      : 'shift-toi';
                  const sessionName =
                    s.sessionType === 'sang' ? '🌅 Sáng' : s.sessionType === 'chieu' ? '☀️ Chiều' : '🌙 Tối';

                  return (
                    <div key={s._id || Math.random()} className={`schedule-card ${sessionClass}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className={`schedule-shift-badge ${badgeClass}`}>
                          {sessionName} • {s.shift}
                        </span>
                      </div>
                      <div className="schedule-course-title">{s.course?.name || 'Môn học'}</div>

                      <div className="schedule-meta-item">
                        <i className="fa-solid fa-layer-group"></i> Mã HP:{' '}
                        <strong style={{ color: '#93c5fd' }}>{s.sectionCode || s.course?.code}</strong>
                      </div>
                      <div className="schedule-meta-item">
                        <i className="fa-solid fa-location-dot"></i> Phòng: <strong>{s.room}</strong>
                      </div>
                      <div className="schedule-meta-item">
                        <i className="fa-solid fa-user-tie"></i> GV: {s.teacher?.name || 'Giảng viên phụ trách'}
                      </div>
                      <div className="schedule-meta-item" style={{ color: '#34d399', fontSize: '10.5px' }}>
                        <i className="fa-solid fa-circle-check"></i> Tiết {s.startPeriod || 1} - {s.endPeriod || 3} (
                        {s.course?.credits || 3} TC)
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
