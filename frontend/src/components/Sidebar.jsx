import React from 'react';

export default function Sidebar({ activeTab, onTabChange, currentUser, unreadCount = 0 }) {
  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan Học Tập', icon: 'fa-chart-pie', group: 'Cổng Cá Nhân' },
    { id: 'notifications', label: 'Thông Báo Giảng Viên', icon: 'fa-bell', group: 'Cổng Cá Nhân' },
    { id: 'portal', label: 'Hồ Sơ & Bảng Điểm', icon: 'fa-id-card', group: 'Cổng Cá Nhân' },
    { id: 'timetable', label: 'Lịch Học Cá Nhân', icon: 'fa-calendar-days', group: 'Cổng Cá Nhân' },
    { id: 'attendance', label: 'Theo Dõi Chuyên Cần', icon: 'fa-clipboard-user', group: 'Cổng Cá Nhân' },
    { id: 'exams', label: 'Lịch Thi Cá Nhân', icon: 'fa-pen-ruler', group: 'Cổng Cá Nhân' },
    { id: 'survey', label: 'Đánh Giá Giảng Dạy', icon: 'fa-star-half-stroke', group: 'Học Thuật & Tốt Nghiệp' },
    { id: 'thesis', label: 'Nộp Đồ Án / Luận Văn', icon: 'fa-file-arrow-up', group: 'Học Thuật & Tốt Nghiệp' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <i className="fa-solid fa-graduation-cap"></i>
        </div>
        <div className="brand-text">
          <h2>STUDENT PORTAL</h2>
          <span>Cổng Thông Tin Sinh Viên</span>
        </div>
      </div>

      <div className="portal-mode-badge">
        <i className="fa-solid fa-user-graduate"></i>
        <span>Tài Khoản Sinh Viên</span>
      </div>

      <div className="nav-group">
        <div className="nav-label">Cổng Cá Nhân</div>
        {navItems.filter(i => i.group === 'Cổng Cá Nhân').map(item => (
          <a
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className={`fa-solid ${item.icon}`} style={{ width: '18px', textAlign: 'center' }}></i>
              <span>{item.label}</span>
            </div>
            {item.id === 'notifications' && unreadCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px',
                minWidth: '16px',
                textAlign: 'center',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
              }}>
                {unreadCount}
              </span>
            )}
          </a>
        ))}

        <div className="nav-label">Học Thuật & Tốt Nghiệp</div>
        {navItems.filter(i => i.group === 'Học Thuật & Tốt Nghiệp').map(item => (
          <a
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <i className={`fa-solid ${item.icon}`}></i>
            <span>{item.label}</span>
          </a>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-quick-profile">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
            alt="Avatar"
            className="user-avatar"
          />
          <div className="user-info">
            <div className="user-name">{currentUser ? currentUser.name : 'Chưa đăng nhập'}</div>
            <div className="user-role-badge">SINH VIÊN</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
