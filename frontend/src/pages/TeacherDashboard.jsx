import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function TeacherDashboard({ currentUser }) {
  const [stats, setStats] = useState({ totalStudents: 0, totalClasses: 0, averageAttendance: 0 });

  useEffect(() => {
    // Ph?c v? sau này khi có API Analytics hoàn ch?nh, t?m th?i mock data
    setStats({
      totalStudents: 120,
      totalClasses: 4,
      averageAttendance: 92.5
    });
  }, []);

  return (
    <div className="dashboard-grid">
      <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
        <h2><i className="fa-solid fa-hand-wave"></i> Xin chào Gi?ng Viên, {currentUser?.name}!</h2>
        <p style={{ color: 'var(--text-muted)' }}>Chào m?ng b?n ð?n v?i h? th?ng qu?n l? h?c v? và gi?ng d?y.</p>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}>
          <i className="fa-solid fa-users"></i>
        </div>
        <div className="stat-info">
          <div className="stat-label">T?ng Sinh Viên Ph? Trách</div>
          <div className="stat-value">{stats.totalStudents}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
          <i className="fa-solid fa-chalkboard"></i>
        </div>
        <div className="stat-info">
          <div className="stat-label">L?p Ðang Gi?ng D?y</div>
          <div className="stat-value">{stats.totalClasses}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.1)' }}>
          <i className="fa-solid fa-chart-line"></i>
        </div>
        <div className="stat-info">
          <div className="stat-label">T? L? Chuyên C?n TB</div>
          <div className="stat-value">{stats.averageAttendance}%</div>
        </div>
      </div>
    </div>
  );
}
