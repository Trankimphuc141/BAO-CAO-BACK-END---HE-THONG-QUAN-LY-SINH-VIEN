import React from 'react';

const Dashboard = ({ adminUser }) => {
  return (
    <div className="animate-in">
      {/* Welcome */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', border: 'none', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#fff' }}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
              Xin chào, Admin! 👋
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              Hệ thống Quản lý Đào Tạo — Phòng Đào Tạo
            </p>
          </div>
        </div>
      </div>

      {/* Stats - empty, will be loaded from API later */}
      <div className="grid-cards">
        {[
          { title: 'Tổng Sinh Viên', icon: 'fa-user-graduate', color: '#2563eb', bg: 'rgba(37,99,235,0.1)', value: '—' },
          { title: 'Tổng Giảng Viên', icon: 'fa-chalkboard-user', color: '#059669', bg: 'rgba(5,150,105,0.1)', value: '—' },
          { title: 'Lớp Học Đang Mở', icon: 'fa-door-open', color: '#d97706', bg: 'rgba(217,119,6,0.1)', value: '—' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-header">
              <span className="stat-title">{stat.title}</span>
              <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
            </div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-desc">Đang tải dữ liệu...</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-bolt"></i> Thao Tác Nhanh</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Thêm Sinh Viên', icon: 'fa-user-plus', color: '#2563eb' },
            { label: 'Thêm Giảng Viên', icon: 'fa-chalkboard-user', color: '#059669' },
          ].map((action, i) => (
            <button key={i} className="btn btn-secondary" style={{ padding: '14px', justifyContent: 'flex-start', gap: '10px', border: '1px solid var(--border-color)' }}>
              <i className={`fa-solid ${action.icon}`} style={{ color: action.color, fontSize: '16px' }}></i>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
