import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const NOTIF_CONFIGS = {
  grade_published: { label: 'Công Bố Điểm', badgeClass: 'badge-success', icon: 'fa-file-signature', color: '#10b981' },
  grade_locked: { label: 'Khóa Bảng Điểm', badgeClass: 'badge-danger', icon: 'fa-lock', color: '#ef4444' },
  attendance: { label: 'Điểm Danh', badgeClass: 'badge-info', icon: 'fa-clipboard-user', color: '#3b82f6' },
  assignment: { label: 'Bài Tập & Hạn Nộp', badgeClass: 'badge-purple', icon: 'fa-book-open', color: '#8b5cf6' },
  announcement: { label: 'Thông Báo Giảng Viên', badgeClass: 'badge-warning', icon: 'fa-bullhorn', color: '#f59e0b' },
  request_response: { label: 'Phản Hồi Yêu Cầu', badgeClass: 'badge-info', icon: 'fa-comment-dots', color: '#06b6d4' },
  system: { label: 'Thông Báo Hệ Thống', badgeClass: 'badge-secondary', icon: 'fa-circle-info', color: '#64748b' }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unread: 0 });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const res = await api.getNotifications();
    if (res.success && res.data) {
      setNotifications(res.data);
      updateStats(res.data);
    }
    setLoading(false);
  };

  const updateStats = (data) => {
    const total = data.length;
    const unread = data.filter(n => !n.isRead).length;
    setStats({ total, unread });
  };

  const handleMarkAsRead = async (notifId, isRead) => {
    if (isRead) return; // Already read
    
    // Optimistic update locally
    const updated = notifications.map(n => n._id === notifId ? { ...n, isRead: true } : n);
    setNotifications(updated);
    updateStats(updated);

    // Call API
    await api.markNotificationRead(notifId);
  };

  const handleMarkAllAsRead = async () => {
    if (stats.unread === 0) return;
    
    // Optimistic update locally
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    updateStats(updated);

    // Call API
    await api.markAllNotificationsRead();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • ${d.toLocaleDateString('vi-VN')}`;
  };

  return (
    <div className="glass-panel" style={{ position: 'relative' }}>
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '15px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-bell"></i> Hộp Thư Thông Báo Từ Giảng Viên & Học Vụ
          {stats.unread > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '20px',
              fontWeight: 800
            }}>
              {stats.unread} chưa đọc
            </span>
          )}
        </h3>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {stats.unread > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkAllAsRead}>
              <i className="fa-solid fa-circle-check"></i> Đọc tất cả
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={loadNotifications} disabled={loading}>
            <i className="fa-solid fa-rotate"></i> Làm mới
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
            Đang tải thông báo...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <i className="fa-regular fa-envelope-open" style={{ fontSize: '38px', color: 'var(--text-light)', marginBottom: '12px', display: 'block', opacity: 0.5 }}></i>
            <span>Bạn chưa nhận được thông báo cá nhân nào từ giảng viên.</span>
          </div>
        ) : (
          notifications.map((notif) => {
            const config = NOTIF_CONFIGS[notif.type] || NOTIF_CONFIGS.system;
            return (
              <div
                key={notif._id}
                onClick={() => handleMarkAsRead(notif._id, notif.isRead)}
                style={{
                  padding: '16px 20px',
                  background: notif.isRead ? 'rgba(255, 255, 255, 0.015)' : 'rgba(59, 130, 246, 0.05)',
                  border: notif.isRead ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: '12px',
                  cursor: notif.isRead ? 'default' : 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  display: 'flex',
                  gap: '15px'
                }}
                className={notif.isRead ? '' : 'unread-notif-card'}
              >
                {/* Unread blue dot indicator */}
                {!notif.isRead && (
                  <span style={{
                    position: 'absolute',
                    top: '16px',
                    left: '6px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    boxShadow: '0 0 8px #3b82f6'
                  }} />
                )}

                {/* Left icon wrapper */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: notif.isRead ? 'rgba(255, 255, 255, 0.05)' : `${config.color}20`,
                  color: notif.isRead ? 'var(--text-light)' : config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  <i className={`fa-solid ${config.icon}`}></i>
                </div>

                {/* Content area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <span className={`badge ${config.badgeClass}`} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {config.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      <i className="fa-regular fa-clock"></i> {formatTime(notif.createdAt)}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '14.5px', fontWeight: notif.isRead ? 600 : 800, color: notif.isRead ? '#e2e8f0' : '#fff', marginBottom: '6px' }}>
                    {notif.title}
                  </h4>
                  <p style={{ fontSize: '12.5px', color: notif.isRead ? 'var(--text-muted)' : 'var(--text-light)', lineHeight: '1.5', margin: 0 }}>
                    {notif.content}
                  </p>

                  {/* Sender teacher footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <img 
                      src={notif.sender?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=50&q=80'} 
                      alt="" 
                      style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span>Gửi bởi: <strong>{notif.sender?.name || 'Giảng viên'}</strong> {notif.sender?.code ? `(mã: ${notif.sender.code})` : ''}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
