import React, { useState } from 'react';

export default function Sidebar({ activeTab, onTabChange, currentUser, unreadCount = 0 }) {
  // Cấu trúc phân mục chủ đề navbar sinh viên
  const menuGroups = [
    {
      id: 'general',
      title: 'Tổng Quan',
      icon: 'fa-grip',
      color: '#818cf8',
      items: [
        { id: 'dashboard', label: 'Trang Chủ', icon: 'fa-house' },
        { id: 'notifications', label: 'Thông Báo', icon: 'fa-bell', hasBadge: true },
      ]
    },
    {
      id: 'learning',
      title: 'Học Tập',
      icon: 'fa-book-open',
      color: '#34d399',
      items: [
        { id: 'portal', label: 'Hồ Sơ & Bảng Điểm', icon: 'fa-id-card-clip' },
        { id: 'timetable', label: 'Lịch Học', icon: 'fa-calendar-days' },
        { id: 'attendance', label: 'Chuyên Cần', icon: 'fa-user-check' },
        { id: 'exams', label: 'Lịch Thi', icon: 'fa-file-pen' },
      ]
    },
    {
      id: 'academic',
      title: 'Đào Tạo',
      icon: 'fa-graduation-cap',
      color: '#f59e0b',
      items: [
        { id: 'curriculum', label: 'Chương Trình ĐT', icon: 'fa-award' },
        { id: 'registration', label: 'Đăng Ký HP', icon: 'fa-rectangle-list' },
        { id: 'survey', label: 'Đánh Giá Giảng Viên', icon: 'fa-star' },
        { id: 'thesis', label: 'Nộp Đồ Án', icon: 'fa-file-arrow-up' },
      ]
    }
  ];

  // Trạng thái mở/đóng từng nhóm (mặc định mở tất cả)
  const [openGroups, setOpenGroups] = useState({
    general: true,
    learning: true,
    academic: true,
  });

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-wrap">
          <img src="/vus_logo.png" alt="VUS" className="sidebar-logo-img" />
        </div>
        <div className="brand-text">
          <h2 className="brand-name">VUS Student</h2>
          <span className="brand-sub">Hệ Thống Quản Lý</span>
        </div>
      </div>

      {/* Portal badge */}
      <div className="portal-mode-badge">
        <i className="fa-solid fa-user-graduate"></i>
        <span>Cổng Sinh Viên</span>
      </div>

      {/* Navigation */}
      <nav className="nav-group">
        {menuGroups.map(group => {
          const isOpen = !!openGroups[group.id];
          const itemCount = group.items.length;

          return (
            <div key={group.id} className="nav-category-block">
              {/* Group header */}
              <button
                className={`nav-group-header ${isOpen ? 'open' : ''}`}
                onClick={() => toggleGroup(group.id)}
                title={isOpen ? 'Thu gọn' : 'Mở rộng'}
              >
                <div className="nav-group-left">
                  <span className="nav-group-dot" style={{ background: group.color }}></span>
                  <i className={`fa-solid ${group.icon} nav-group-icon`} style={{ color: group.color }}></i>
                  <span className="nav-group-title">{group.title}</span>
                </div>
                <div className="nav-group-right">
                  <span className="nav-group-count">{itemCount}</span>
                  <i className={`fa-solid fa-chevron-right nav-group-chevron ${isOpen ? 'rotated' : ''}`}></i>
                </div>
              </button>

              {/* Items with smooth height animation */}
              <div className={`nav-items-wrapper ${isOpen ? 'expanded' : 'collapsed'}`}>
                <div className="nav-category-items">
                  {group.items.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <a
                        key={item.id}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => onTabChange(item.id)}
                        title={item.label}
                      >
                        <span className={`nav-item-icon-wrap ${isActive ? 'active-icon' : ''}`}>
                          <i className={`fa-solid ${item.icon}`}></i>
                        </span>
                        <span className="nav-item-label">{item.label}</span>
                        {item.hasBadge && unreadCount > 0 && (
                          <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
                        {isActive && <span className="nav-active-bar"></span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-quick-profile">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
            alt="Avatar"
            className="user-avatar"
          />
          <div className="user-info">
            <div className="user-name">{currentUser ? currentUser.name : 'Chưa đăng nhập'}</div>
            <div className="user-role-badge">
              <i className="fa-solid fa-circle-dot" style={{ color: '#4ade80', fontSize: '7px' }}></i>
              &nbsp;MÃ SV: {currentUser?.code || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
