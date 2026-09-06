import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Tổng Quan', icon: 'fa-chart-pie', group: 'Quản Trị' },
  { path: '/students', label: 'Quản Lý Sinh Viên', icon: 'fa-user-graduate', group: 'Quản Trị' },
  { path: '/teachers', label: 'Quản Lý Giảng Viên', icon: 'fa-chalkboard-user', group: 'Quản Trị' },
];

const Layout = ({ adminUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem = navItems.find(item =>
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
          <div className="nav-label">Quản Trị</div>
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-quick-profile">
            <img
              src={adminUser?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'}
              alt="Admin"
              className="user-avatar"
            />
            <div className="user-info">
              <div className="user-name">Admin</div>
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
