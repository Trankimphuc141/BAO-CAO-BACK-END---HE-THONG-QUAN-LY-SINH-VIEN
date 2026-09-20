import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {
    // audio policy safety
  }
};

const menuGroups = [
  {
    id: 'general',
    title: 'QUẢN LÝ CHUNG',
    icon: 'fa-cubes',
    items: [
      { path: '/', label: 'Tổng Quan', icon: 'fa-chart-pie' },
      { path: '/students', label: 'Quản Lý Sinh Viên', icon: 'fa-user-graduate' },
      { path: '/teachers', label: 'Quản Lý Giảng Viên', icon: 'fa-chalkboard-user' },
      { path: '/notifications', label: 'Quản Lý Thông Báo', icon: 'fa-bullhorn' },
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
      { path: '/teacher-evaluations', label: 'Đánh Giá Giảng Viên', icon: 'fa-star' },
    ]
  },
  {
    id: 'system',
    title: 'GIÁM SÁT HỆ THỐNG',
    icon: 'fa-shield-halved',
    items: [
      { path: '/activity-log', label: 'Nhật Ký Hoạt Động', icon: 'fa-clock-rotate-left' },
    ]
  }
];


const Layout = ({ adminUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [realtimeNotif, setRealtimeNotif] = useState(null);

  // Trạng thái mở/đóng từng phân mục (mặc định mở tất cả)
  const [openGroups, setOpenGroups] = useState({
    general: true,
    academic: true,
    system: true,
  });

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Tự ẩn thông báo sau 6 giây
  useEffect(() => {
    if (!realtimeNotif) return;
    const timer = setTimeout(() => setRealtimeNotif(null), 6000);
    return () => clearTimeout(timer);
  }, [realtimeNotif]);

  // Lắng nghe sự kiện thông báo cục bộ khi Admin vừa phát thành công
  useEffect(() => {
    const handleLocalNotif = (e) => {
      if (e.detail) {
        playNotificationSound();
        setRealtimeNotif(e.detail);
      }
    };
    window.addEventListener('admin-local-notification', handleLocalNotif);
    return () => window.removeEventListener('admin-local-notification', handleLocalNotif);
  }, []);

  // Kết nối socket realtime cho Admin
  useEffect(() => {
    const adminId = adminUser?._id || adminUser?.id;
    const socketUrl = window.location.hostname === '127.0.0.1' 
      ? 'http://127.0.0.1:5000' 
      : 'http://localhost:5000';

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    const emitJoin = () => {
      socket.emit('join-room', { userId: adminId, role: 'admin' });
      socket.emit('join', { userId: adminId, role: 'admin' });
    };

    socket.on('connect', emitJoin);
    emitJoin();

    const handleNewNotification = (data) => {
      console.log('🔔 [Admin] Real-time notification received:', data);
      playNotificationSound();
      setRealtimeNotif(data);
    };

    socket.on('new-notification', handleNewNotification);

    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.disconnect();
    };
  }, [adminUser]);

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

      {/* Realtime Notification Popup Toast for Admin */}
      {realtimeNotif && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            minWidth: '340px',
            maxWidth: '420px',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: '14px',
            boxShadow: '0 20px 40px -5px rgba(0, 0, 0, 0.5), 0 0 0 1.5px rgba(99, 102, 241, 0.4)',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            cursor: 'pointer',
            animation: 'slideInRightToast 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onClick={() => {
            if (realtimeNotif.link) navigate(realtimeNotif.link);
            setRealtimeNotif(null);
          }}
        >
          <style>{`
            @keyframes slideInRightToast {
              from { transform: translateX(120%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              border: '1.5px solid rgba(129, 140, 248, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              flexShrink: 0,
              fontSize: '18px',
            }}
          >
            <i className="fa-solid fa-bell"></i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#818cf8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                🔔 Thông Báo Mới
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRealtimeNotif(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px 4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#ffffff', marginBottom: '4px', lineHeight: 1.3 }}>
              {realtimeNotif.title}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.45, marginBottom: '8px' }}>
              {realtimeNotif.content}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(99, 102, 241, 0.3)',
                  color: '#c7d2fe',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(129, 140, 248, 0.3)',
                }}
              >
                Xem chi tiết →
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
