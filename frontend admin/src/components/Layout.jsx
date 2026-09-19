import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const menuGroups = [
  {
    id: 'general',
    title: 'QUẢN LÝ CHUNG',
    icon: 'fa-cubes',
    items: [
      { path: '/', label: 'Tổng Quan', icon: 'fa-chart-pie' },
      { path: '/students', label: 'Quản Lý Sinh Viên', icon: 'fa-user-graduate' },
      { path: '/teachers', label: 'Quản Lý Giảng Viên', icon: 'fa-chalkboard-user' },
    ]
  },
  {
    id: 'academic',
    title: 'QUẢN LÝ HỌC THUẬT',
    icon: 'fa-graduation-cap',
    items: [
      { path: '/academic-catalog', label: 'Chương Trình & Môn Học', icon: 'fa-book-bookmark' },
      { path: '/course-classes', label: 'Học Phần & Phân Công', icon: 'fa-calendar-check' },
      { path: '/attendance-history', label: 'Lịch Sử Điểm Danh', icon: 'fa-clock-rotate-left' },
      { path: '/grades', label: 'Quản Lý & Duyệt Điểm', icon: 'fa-award' },
    ]
  }
];


const Layout = ({ adminUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Trạng thái mở/đóng từng phân mục (mặc định mở tất cả)
  const [openGroups, setOpenGroups] = useState({
    general: true,
    academic: true,
  });

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const allItems = menuGroups.flatMap(g => g.items);
  const activeItem = allItems.find(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div className="brand-text">
            <h2>Admin Portal</h2>
            <span>Phòng Đào Tạo</span>
          </div>
        </div>

        <div className="portal-mode-badge">
          <i className="fa-solid fa-user-tie"></i>
          <span>Quản Trị Viên</span>
        </div>

        <nav className="nav-group">
          {menuGroups.map(group => {
            const isOpen = !!openGroups[group.id];

            return (
              <div key={group.id} className="nav-category-block">
                <div
                  className="nav-label-header"
                  onClick={() => toggleGroup(group.id)}
                  title="Bấm để đóng / mở phân mục"
                >
                  <div className="nav-label-title">
                    <i className={`fa-solid ${group.icon} group-icon`}></i>
                    <span>{group.title}</span>
                  </div>
                  <i className={`fa-solid fa-chevron-down toggle-chevron ${isOpen ? '' : 'collapsed'}`}></i>
                </div>

                {isOpen && (
                  <div className="nav-category-items">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                      return (
                        <button
                          key={item.path}
                          className={`nav-item ${isActive ? 'active' : ''}`}
                          onClick={() => navigate(item.path)}
                        >
                          <i className={`fa-solid ${item.icon}`}></i>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-quick-profile">
            <img
              src={adminUser?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'}
              alt="Admin"
              className="user-avatar"
            />
            <div className="user-info">
              <div className="user-name">{adminUser?.name || 'Admin'}</div>
              <div className="user-role-badge">QUẢN TRỊ VIÊN</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-title">
            <h1>
              <i className={`fa-solid ${activeItem?.icon || 'fa-chart-pie'}`}></i>
              {activeItem?.label || 'Admin Portal'}
            </h1>
            <p>Hệ thống Quản lý Đào Tạo</p>
          </div>
          <div className="header-actions">
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {adminUser?.name || 'Admin User'}
            </span>
            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
            >
              <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
            </button>
          </div>
        </header>

        <main className="content-body animate-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
