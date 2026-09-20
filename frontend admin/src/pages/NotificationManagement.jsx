import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const NOTIF_TYPES = [
  { id: 'announcement', label: 'Thông Báo Chung', icon: 'fa-bullhorn', color: '#0891b2', badgeCls: 'badge-info' },
  { id: 'system', label: 'Thông Báo Hệ Thống', icon: 'fa-gear', color: '#6366f1', badgeCls: 'badge-purple' },
  { id: 'assignment', label: 'Học Vụ & Bài Tập', icon: 'fa-book-open', color: '#f59e0b', badgeCls: 'badge-warning' },
  { id: 'grade_published', label: 'Điểm Thi & Kết Quả', icon: 'fa-award', color: '#10b981', badgeCls: 'badge-success' },
];

const TARGET_OPTIONS = [
  { id: 'all', label: 'Toàn Hệ Thống', desc: 'Gửi tới tất cả Giảng viên & Sinh viên', icon: 'fa-users' },
  { id: 'students', label: 'Tất Cả Sinh Viên', desc: 'Chỉ gửi tới toàn bộ sinh viên', icon: 'fa-user-graduate' },
  { id: 'teachers', label: 'Tất Cả Giảng Viên', desc: 'Chỉ gửi tới toàn bộ giảng viên', icon: 'fa-chalkboard-user' },
  { id: 'class_section', label: 'Theo Lớp Học Phần', desc: 'Gửi tới sinh viên và giảng viên của lớp', icon: 'fa-school' },
  { id: 'specific_users', label: 'Người Dùng Cụ Thể', desc: 'Chọn danh sách người nhận theo tên / mã', icon: 'fa-user-check' },
];

export default function NotificationManagement() {
  const [loading, setLoading] = useState(false);
  const [targetsData, setTargetsData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalUsers: 0,
    classSections: [],
    users: []
  });

  // Form state
  const [targetType, setTargetType] = useState('all');
  const [selectedClassSection, setSelectedClassSection] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [notifType, setNotifType] = useState('announcement');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // History state
  const [notifications, setNotifications] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSent, setTotalSent] = useState(0);

  // User search filter for specific_users
  const [userSearch, setUserSearch] = useState('');

  // Load targets metadata
  const loadTargets = async () => {
    const res = await api.getNotificationTargets();
    if (res.success && res.data) {
      setTargetsData(res.data);
      if (res.data.classSections?.length > 0) {
        setSelectedClassSection(res.data.classSections[0]._id);
      }
    }
  };

  // Load sent history
  const loadHistory = useCallback(async (p = 1, search = '') => {
    setHistoryLoading(true);
    const res = await api.getSentNotifications({ page: p, limit: 15, search });
    if (res.success && res.data) {
      setNotifications(res.data);
      setTotalSent(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setPage(res.page || 1);
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadTargets();
    loadHistory(1, '');
  }, [loadHistory]);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề thông báo!');
      return;
    }
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung thông báo!');
      return;
    }

    if (targetType === 'class_section' && !selectedClassSection) {
      alert('Vui lòng chọn lớp học phần!');
      return;
    }

    if (targetType === 'specific_users' && selectedUserIds.length === 0) {
      alert('Vui lòng chọn ít nhất một người nhận!');
      return;
    }

    setSending(true);
    setFeedbackMsg(null);

    const payload = {
      targetType,
      classSectionId: targetType === 'class_section' ? selectedClassSection : undefined,
      userIds: targetType === 'specific_users' ? selectedUserIds : undefined,
      notifType,
      type: notifType,
      title: title.trim(),
      content: content.trim(),
      link: link.trim()
    };

    const res = await api.sendNotification(payload);
    setSending(false);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `🎉 ${res.message || 'Đã phát thông báo thành công!'}`
      });

      // Kích hoạt ngay popup toast trên màn hình Admin
      window.dispatchEvent(new CustomEvent('admin-local-notification', {
        detail: {
          type: notifType,
          title: `📢 ${title.trim()}`,
          content: content.trim(),
          link: link.trim()
        }
      }));

      // Reset form fields
      setTitle('');
      setContent('');
      setLink('');
      setSelectedUserIds([]);
      // Reload history
      loadHistory(1, searchQuery);
    } else {
      setFeedbackMsg({
        type: 'error',
        text: `❌ Lỗi: ${res.message || 'Không thể gửi thông báo'}`
      });
    }
  };

  const handleDeleteNotif = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi thông báo này?')) return;
    const res = await api.deleteNotification(id);
    if (res.success) {
      loadHistory(page, searchQuery);
    } else {
      alert('Lỗi khi xóa thông báo');
    }
  };

  // Filtered users for specific user target
  const filteredUsers = targetsData.users.filter(u => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(term) || (u.code || '').toLowerCase().includes(term);
  });

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Stats */}
      <div className="section-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)', color: 'white', borderRadius: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#c7d2fe', marginBottom: '8px' }}>
              <i className="fa-solid fa-satellite-dish" style={{ color: '#818cf8' }}></i>
              <span>Trung Tâm Phát Thông Báo Realtime</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: 'white' }}>
              Quản Lý & Phát Thông Báo
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.75)', maxWidth: '640px' }}>
              Gửi thông báo xuất hiện tức thì (Real-time Popup Toast) kèm âm thanh chuông đến toàn trường, từng nhóm giảng viên, sinh viên hoặc lớp học phần.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '12px 18px', minWidth: '130px', textAlign: 'center' }}>
              <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', fontWeight: 700 }}>Sinh Viên</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8' }}>{targetsData.totalStudents}</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '12px 18px', minWidth: '130px', textAlign: 'center' }}>
              <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', fontWeight: 700 }}>Giảng Viên</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#a78bfa' }}>{targetsData.totalTeachers}</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '12px 18px', minWidth: '130px', textAlign: 'center' }}>
              <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', fontWeight: 700 }}>Đã Gửi</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#4ade80' }}>{totalSent}</div>
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '13.5px',
            backgroundColor: feedbackMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: feedbackMsg.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Compose on Left, Live Preview on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px' }}>
        {/* Form Compose */}
        <div className="section-card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              <i className="fa-solid fa-paper-plane"></i>
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Soạn & Phát Thông Báo Mới</h2>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Cấu hình đối tượng và nội dung thông báo thời gian thực</span>
            </div>
          </div>

          <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Target Audience selection */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
                1. Chọn Đối Tượng Nhận <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                {TARGET_OPTIONS.map(opt => {
                  const isSelected = targetType === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setTargetType(opt.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                        backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                        color: isSelected ? 'var(--primary-dark)' : 'var(--text-sub)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className={`fa-solid ${opt.icon}`} style={{ fontSize: '18px', color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}></i>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Sub-Selection */}
            {targetType === 'class_section' && (
              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Chọn Lớp Học Phần:
                </label>
                <select
                  value={selectedClassSection}
                  onChange={(e) => setSelectedClassSection(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: '13px'
                  }}
                >
                  {targetsData.classSections.map(cs => (
                    <option key={cs._id} value={cs._id}>
                      {cs.sectionCode} — {cs.courseName} (GV: {cs.teacherName || 'Chưa phân công'} - {cs.studentCount} SV)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'specific_users' && (
              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700 }}>
                    Chọn Người Nhận ({selectedUserIds.length} đã chọn):
                  </label>
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc mã SV/GV..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      width: '180px'
                    }}
                  />
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredUsers.slice(0, 50).map(u => {
                    const isChecked = selectedUserIds.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => toggleUserSelection(u._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: isChecked ? 'var(--primary-light)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({u.code})</span>
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '10.5px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: u.role === 'teacher' ? '#e0e7ff' : '#dcfce7',
                          color: u.role === 'teacher' ? '#3730a3' : '#166534',
                          fontWeight: 700
                        }}>
                          {u.role === 'teacher' ? 'GV' : 'SV'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notification Type */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
                2. Loại Thông Báo
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {NOTIF_TYPES.map(t => {
                  const isSelected = notifType === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setNotifType(t.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: `1.5px solid ${isSelected ? t.color : 'var(--border-color)'}`,
                        backgroundColor: isSelected ? `${t.color}15` : 'transparent',
                        color: isSelected ? t.color : 'var(--text-sub)',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className={`fa-solid ${t.icon}`}></i>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                3. Tiêu Đề Thông Báo <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Lịch nghỉ lễ 30/4 - 1/5 và kế hoạch học bù chính thức"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border-color)',
                  fontSize: '13.5px',
                  outline: 'none',
                  transition: 'border 0.2s ease'
                }}
              />
            </div>

            {/* Content */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                4. Nội Dung Chi Tiết <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung thông báo đầy đủ gửi đến các đối tượng..."
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border-color)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {/* Action Link (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                5. Đường Dẫn Điều Hướng Khi Bấm Vào (Tùy chọn)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="VD: /grades, /profile, /schedule..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px'
                }}
              />
            </div>

            {/* Submit button */}
            <div style={{ marginTop: '8px' }}>
              <button
                type="submit"
                disabled={sending}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '10px',
                  cursor: sending ? 'not-allowed' : 'pointer'
                }}
              >
                {sending ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Đang phát thông báo thời gian thực...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>
                    <span>Phát Thông Báo Realtime Ngay 🚀</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="section-card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <i className="fa-solid fa-eye" style={{ color: 'var(--primary)' }}></i>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Xem Trước Popup Realtime</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Đây là giao diện Popup Toast sẽ lập tức xuất hiện ở góc trên bên phải màn hình của người nhận cùng chuông báo khi Admin gửi:
            </p>

            {/* Simulated Floating Toast */}
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(16px)',
                color: '#ffffff',
                padding: '16px 18px',
                borderRadius: '16px',
                border: '1.5px solid rgba(99, 102, 241, 0.6)',
                boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(129, 140, 248, 0.3)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(99, 102, 241, 0.25)',
                  border: '1.5px solid rgba(129, 140, 248, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                  flexShrink: 0,
                  fontSize: '16px'
                }}
              >
                <i className="fa-solid fa-bell"></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: '#818cf8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em'
                    }}
                  >
                    🔔 {NOTIF_TYPES.find(t => t.id === notifType)?.label || 'Thông Báo Mới'}
                  </span>
                  <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)' }}>✕</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff', marginBottom: '4px', lineHeight: 1.3 }}>
                  {title || 'Tiêu đề thông báo mẫu'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.4, marginBottom: '8px' }}>
                  {content || 'Nội dung thông báo sẽ xuất hiện ở đây khi bạn soạn thảo...'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>Từ: Phòng Đào Tạo</span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(99, 102, 241, 0.35)',
                      color: '#c7d2fe',
                      padding: '3px 9px',
                      borderRadius: '10px',
                      border: '1px solid rgba(129, 140, 248, 0.3)'
                    }}
                  >
                    Xem chi tiết →
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-sub)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                <span>Tự động phát chuông âm thanh êm dịu</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                <span>Tự đóng sau 6 giây hoặc đóng bằng nút ✕</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                <span>Lưu trữ vĩnh viễn vào Hộp thư thông báo của người nhận</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sent Notifications History Table */}
      <div className="section-card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
              Lịch Sử Thông Báo Đã Phát ({totalSent})
            </h2>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Danh sách các thông báo do Quản trị viên phát ra hệ thống</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm thông báo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadHistory(1, e.target.value);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                minWidth: '220px'
              }}
            />
            <button
              type="button"
              onClick={() => loadHistory(page, searchQuery)}
              className="btn btn-secondary btn-sm"
              title="Tải lại"
            >
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>
        </div>

        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
            <p style={{ margin: 0, fontSize: '13px' }}>Đang tải lịch sử thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}></i>
            <p style={{ margin: 0, fontSize: '13.5px' }}>Chưa có thông báo nào được gửi.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px' }}>Thời Gian</th>
                  <th style={{ padding: '12px 14px' }}>Loại</th>
                  <th style={{ padding: '12px 14px' }}>Tiêu Đề & Nội Dung</th>
                  <th style={{ padding: '12px 14px' }}>Người Nhận</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Đã Xem</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map(n => {
                  const typeObj = NOTIF_TYPES.find(t => t.id === n.type) || NOTIF_TYPES[0];
                  const formattedDate = new Date(n.createdAt).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });

                  return (
                    <tr key={n._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {formattedDate}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: `${typeObj.color}15`,
                            color: typeObj.color,
                            border: `1px solid ${typeObj.color}30`
                          }}
                        >
                          <i className={`fa-solid ${typeObj.icon}`} style={{ marginRight: '4px' }}></i>
                          {typeObj.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: '320px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
                          {n.title}
                        </div>
                        <div style={{ color: 'var(--text-sub)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.content}
                        </div>
                        {n.link && (
                          <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px' }}>
                            <i className="fa-solid fa-link" style={{ marginRight: '4px' }}></i>
                            {n.link}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {n.recipient ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{n.recipient.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11.5px', display: 'block' }}>
                              {n.recipient.code} ({n.recipient.role === 'teacher' ? 'GV' : 'SV'})
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Toàn trường</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {n.isRead ? (
                          <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                            <i className="fa-solid fa-check-double" style={{ marginRight: '4px' }}></i> Đã xem
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            <i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i> Chưa xem
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotif(n._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '13px',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }}
                          title="Xóa thông báo"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <button
              disabled={page <= 1}
              onClick={() => loadHistory(page - 1, searchQuery)}
              className="btn btn-secondary btn-sm"
            >
              Trang trước
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Trang {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => loadHistory(page + 1, searchQuery)}
              className="btn btn-secondary btn-sm"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
