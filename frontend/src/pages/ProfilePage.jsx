import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';

export default function ProfilePage({ currentUser, onAvatarUpdated }) {
  const [profile, setProfile] = useState(null);
  const [grades, setGrades] = useState([]);
  const [enrolledSections, setEnrolledSections] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [summary, setSummary] = useState({ gpa4: '0.0', gpa10: '0.0', standing: '-' });
  const [announcements, setAnnouncements] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('Tất cả học kỳ');
  const [appealModal, setAppealModal] = useState(null);
  const [appealForm, setAppealForm] = useState({ gradeId: '', classSectionId: '', scoreType: 'final', proposedScore: '', reason: '', studentNote: '' });
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [viewAppealDetail, setViewAppealDetail] = useState(null);
  const [chatText, setChatText] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfileData();
  }, [currentUser]);

  // Auto-sync on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (currentUser) {
        loadProfileData();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser]);

  // Realtime sync via Socket.IO
  useEffect(() => {
    if (!currentUser) return;
    const socketUrl = window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:5000' : 'http://localhost:5000';
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    const handleRealtimeSync = () => {
      loadProfileData();
    };

    socket.on('grade-updated', handleRealtimeSync);
    socket.on('grades-published', handleRealtimeSync);
    socket.on('appeal-updated', handleRealtimeSync);
    socket.on('attendance-updated', handleRealtimeSync);
    socket.on('attendance-synced', handleRealtimeSync);

    return () => {
      socket.off('grade-updated', handleRealtimeSync);
      socket.off('grades-published', handleRealtimeSync);
      socket.off('appeal-updated', handleRealtimeSync);
      socket.off('attendance-updated', handleRealtimeSync);
      socket.off('attendance-synced', handleRealtimeSync);
      socket.disconnect();
    };
  }, [currentUser]);

  const loadProfileData = async () => {
    if (!currentUser) return;
    const res = await api.getStudentPortalInfo(currentUser.id);
    if (res.success) {
      setProfile(res.student);
      setGrades(res.grades || []);
      setEnrolledSections(res.enrolledSections || []);
      setAppeals(res.appeals || []);
      if (res.academicSummary) {
        setSummary({
          gpa4: res.academicSummary.gpa4,
          gpa10: res.academicSummary.gpa10,
          standing: res.academicSummary.academicStanding
        });
      }
    }

    const annRes = await api.getAnnouncements();
    if (annRes.success && annRes.data) {
      setAnnouncements(annRes.data);
    }
  };

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!appealForm.reason.trim()) {
      alert('Vui lòng nhập lý do / nội dung xin phúc khảo điểm số!');
      return;
    }

    setSubmittingAppeal(true);
    try {
      const targetId = appealForm.gradeId || appealModal?._id;
      const payload = {
        ...appealForm,
        gradeId: targetId,
        classSectionId: appealForm.classSectionId || appealModal?.classSection?._id || appealModal?.classSection || appealModal?._id
      };
      const res = await api.submitGradeAppeal(targetId, payload);
      if (res.success) {
        alert('🎉 ' + (res.message || 'Đơn phúc khảo điểm đã được gửi thành công đến Giảng viên phụ trách để xem xét!'));
        setAppealModal(null);
        await loadProfileData();
      } else {
        alert('❌ ' + (res.message || 'Lỗi khi nộp đơn phúc khảo'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối máy chủ');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleSendChatReply = async () => {
    if (!viewAppealDetail || !chatText.trim()) return;
    setChatSending(true);
    try {
      const res = await api.sendAppealMessage(viewAppealDetail.appeal._id, chatText);
      if (res.success) {
        setChatText('');
        // Cập nhật local state với data mới
        setViewAppealDetail(prev => ({ ...prev, appeal: res.data }));
        // Reload to sync
        await loadProfileData();
      } else {
        alert('❌ ' + (res.message || 'Lỗi khi gửi tin nhắn'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối máy chủ');
    } finally {
      setChatSending(false);
    }
  };

  const ALLOWED_IMAGE_TYPES = {
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
    'image/gif': 'GIF',
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra định dạng ảnh — chỉ cho phép JPG, PNG, WEBP, GIF
    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      alert(`❌ Định dạng ảnh không hợp lệ!\nChỉ chấp nhận: ${Object.values(ALLOWED_IMAGE_TYPES).join(', ')}\nBạn đã chọn: ${file.type || 'không xác định'}`);
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Kích thước ảnh quá lớn! Vui lòng chọn ảnh dung lượng dưới 5MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      const res = await api.updateAvatar(base64Data, currentUser.id);
      if (res.success) {
        alert(`📸 Cập nhật ảnh đại diện thành công! (${ALLOWED_IMAGE_TYPES[file.type]})`);
        setProfile((prev) => ({ ...prev, avatar: res.avatar || base64Data }));
        if (onAvatarUpdated) onAvatarUpdated(res.avatar || base64Data);
      } else {
        alert(`❌ Lỗi cập nhật ảnh: ${res.message}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const student = profile || currentUser;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
      <div className="glass-panel">
        <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="avatar-upload-wrapper" style={{ marginBottom: '10px' }}>
            <img
              src={
                student?.avatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
              }
              alt="Avatar"
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                border: '3px solid var(--primary)',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            <button
              className="avatar-edit-badge"
              onClick={() => fileInputRef.current?.click()}
              title="Tải ảnh từ máy tính"
            >
              <i className="fa-solid fa-camera"></i>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".jpg,.jpeg,.png,.webp,.gif"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />

          <div style={{ marginBottom: '12px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '11px', padding: '3px 10px' }}
            >
              <i className="fa-solid fa-upload"></i> Tải ảnh từ máy tính
            </button>
          </div>

          <h3 style={{ fontSize: '16px', color: 'var(--text-main)' }}>{student?.name || '-'}</h3>
          <p style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>Mã SV: {student?.code || '-'}</p>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Khoa:</strong> {student?.department || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Ngành:</strong> {student?.major || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Lớp SH:</strong> {student?.classCode || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Email:</strong> {student?.email || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Khóa học:</strong> {student?.academicYear || '-'}
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '14px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Điểm GPA (Hệ 4):</span>
            <strong style={{ color: '#60a5fa', fontSize: '15px' }}>{summary.gpa4}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Điểm CPA (Hệ 10):</span>
            <strong style={{ color: '#34d399', fontSize: '15px' }}>{summary.gpa10}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Xếp loại:</span>
            <span className="badge badge-success">{summary.standing}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="glass-panel">
          {(() => {
            const publishedGrades = grades.filter(g => g.isPublished);
            const semesters = ['Tất cả học kỳ', ...new Set(publishedGrades.map(g => g.semester).filter(Boolean))];
            const filteredGrades = selectedSemester === 'Tất cả học kỳ' 
              ? publishedGrades 
              : publishedGrades.filter(g => g.semester === selectedSemester);

            const totalCredits = filteredGrades.reduce((sum, g) => sum + (g.course?.credits || 3), 0);
            const sumScore4 = filteredGrades.reduce((sum, g) => sum + (g.totalScore4 || 0) * (g.course?.credits || 3), 0);
            const sumScore10 = filteredGrades.reduce((sum, g) => sum + (g.totalScore10 || 0) * (g.course?.credits || 3), 0);
            
            const gpa4 = totalCredits > 0 ? (sumScore4 / totalCredits).toFixed(2) : '0.00';
            const gpa10 = totalCredits > 0 ? (sumScore10 / totalCredits).toFixed(2) : '0.00';

            return (
              <>
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3>
                    <i className="fa-solid fa-receipt"></i> Bảng Điểm Chi Tiết Các Học Phần
                  </h3>
                  
                  {/* Action Button & Semester Dropdown */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultTarget = grades[0] || enrolledSections[0];
                        setAppealModal(defaultTarget || { _id: 'general' });
                        setAppealForm({
                          gradeId: defaultTarget?._id || '',
                          classSectionId: defaultTarget?.classSection?._id || defaultTarget?._id || '',
                          scoreType: 'final',
                          proposedScore: '',
                          reason: '',
                          studentNote: ''
                        });
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      title="Nộp đơn phúc khảo điểm học phần gửi đến Giảng viên xem xét và chuyển Admin quyết định"
                    >
                      <i className="fa-solid fa-file-signature"></i> Nộp Đơn Phúc Khảo Điểm
                    </button>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Học kỳ:</span>
                      <select 
                        className="form-control" 
                        style={{ padding: '4px 8px', fontSize: '12px', background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', width: '140px' }}
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                      >
                        {semesters.map(sem => (
                          <option key={sem} value={sem} style={{ background: '#ffffff', color: 'var(--text-main)' }}>{sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Semester Summary */}
                <div style={{ display: 'flex', gap: '15px', padding: '10px 14px', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-light)' }}>
                  <div>GPA Học Kỳ (Hệ 4): <strong style={{ color: '#60a5fa' }}>{gpa4}</strong></div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>GPA Học Kỳ (Hệ 10): <strong style={{ color: '#34d399' }}>{gpa10}</strong></div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>Số TC Đăng Ký: <strong>{totalCredits}</strong></div>
                </div>

                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Mã HP</th>
                        <th>Tên Môn Học</th>
                        <th>Số TC</th>
                        <th>Chuyên cần (10%)</th>
                        <th>Giữa kỳ (30%)</th>
                        <th>Cuối kỳ (60%)</th>
                        <th>Điểm hệ 10</th>
                        <th>Điểm chữ</th>
                        <th>Kết quả</th>
                        <th style={{ textAlign: 'center', minWidth: '150px' }}>Phúc Khảo Điểm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrades.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Chưa có dữ liệu bảng điểm học kỳ này hoặc điểm chưa được công bố
                          </td>
                        </tr>
                      ) : (
                        filteredGrades.map((g) => {
                          const activeAppeal = appeals.find(a => String(a.grade?._id || a.grade) === String(g._id));
                          return (
                            <tr key={g._id}>
                              <td>
                                <strong>{g.course?.code || '-'}</strong>
                              </td>
                              <td>{g.course?.name || '-'}</td>
                              <td>{g.course?.credits || 3}</td>
                              <td>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <strong>{g.attendanceScore}</strong>
                                  {g.sessionScores && g.sessionScores.length === 15 && (
                                    <span
                                      title={`Điểm 15 buổi học: ${g.sessionScores.map((s, i) => `B${i+1}:${s === 10 ? '100%' : s === 5 ? '50%' : '0%'}`).join(' | ')}`}
                                      style={{
                                        fontSize: '10.5px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: 'rgba(37,99,235,0.12)',
                                        color: '#2563eb',
                                        cursor: 'help',
                                        fontWeight: 600
                                      }}
                                    >
                                      15 buổi
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                  <span>{g.midtermScore}</span>
                                  {activeAppeal && activeAppeal.scoreType === 'midterm' && activeAppeal.status !== 'admin_approved_published' && (
                                    <span style={{ fontSize: '9.5px', color: '#b45309', fontWeight: 700, background: '#fef3c7', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }} title="Điểm ban đầu. Điểm mới chỉ đổi khi Admin chốt và công bố chính thức!">
                                      Điểm gốc (Đang PK)
                                    </span>
                                  )}
                                  {activeAppeal && activeAppeal.scoreType === 'midterm' && activeAppeal.status === 'admin_approved_published' && (
                                    <span style={{ fontSize: '9.5px', color: '#047857', fontWeight: 800, background: '#d1fae5', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }} title="Điểm mới đã được Admin phê duyệt & công bố chính thức!">
                                      Đã chốt mới
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                  <span>{g.finalScore}</span>
                                  {activeAppeal && activeAppeal.scoreType === 'final' && activeAppeal.status !== 'admin_approved_published' && (
                                    <span style={{ fontSize: '9.5px', color: '#b45309', fontWeight: 700, background: '#fef3c7', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }} title="Điểm ban đầu. Điểm mới chỉ đổi khi Admin chốt và công bố chính thức!">
                                      Điểm gốc (Đang PK)
                                    </span>
                                  )}
                                  {activeAppeal && activeAppeal.scoreType === 'final' && activeAppeal.status === 'admin_approved_published' && (
                                    <span style={{ fontSize: '9.5px', color: '#047857', fontWeight: 800, background: '#d1fae5', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }} title="Điểm mới đã được Admin phê duyệt & công bố chính thức!">
                                      Đã chốt mới
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <strong style={{ color: '#60a5fa' }}>{g.totalScore10}</strong>
                              </td>
                              <td>
                                <span className={`badge ${g.letterGrade === 'F' ? 'badge-danger' : 'badge-info'}`}>
                                  {g.letterGrade}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${g.isPassed ? 'badge-success' : 'badge-danger'}`}>
                                  {g.isPassed ? (
                                    <>
                                      <i className="fa-solid fa-check"></i> Đạt
                                    </>
                                  ) : (
                                    <>
                                      <i className="fa-solid fa-xmark"></i> Học lại
                                    </>
                                  )}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {activeAppeal ? (
                                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    {(() => {
                                      const statusMap = {
                                        'pending_teacher': { text: '⏳ Chờ GV xem xét', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
                                        'teacher_replied': { text: '💬 GV đã trao đổi', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
                                        'teacher_rejected': { text: '❌ GV từ chối', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
                                        'teacher_request_unlock': { text: '📤 Đã gửi Admin duyệt', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe' },
                                        'admin_unlocked': { text: '✏️ Admin mở khóa - Đang chấm lại', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
                                        'teacher_re_submitted': { text: '🔄 Chờ Admin chốt công bố', color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe' },
                                        'admin_approved_published': { text: '✅ Admin đã duyệt & cập nhật điểm', color: '#047857', bg: '#d1fae5', border: '#6ee7b7' }
                                      };
                                      const st = statusMap[activeAppeal.status] || { text: 'Đang xử lý', color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' };
                                      return (
                                        <>
                                          <span
                                            style={{
                                              fontSize: '11px',
                                              padding: '3px 8px',
                                              borderRadius: '6px',
                                              fontWeight: 700,
                                              color: st.color,
                                              background: st.bg,
                                              border: `1px solid ${st.border}`,
                                              display: 'inline-block'
                                            }}
                                          >
                                            {st.text}
                                          </span>
                                          {activeAppeal.status !== 'admin_approved_published' && activeAppeal.status !== 'teacher_rejected' && (
                                            <div style={{ fontSize: '9.5px', color: '#64748b', fontStyle: 'italic', maxWidth: '145px', lineHeight: 1.2 }}>
                                              (Điểm mới chỉ đổi khi Admin chốt công bố)
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}

                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => setViewAppealDetail({ appeal: activeAppeal, grade: g })}
                                        style={{
                                          fontSize: '11px',
                                          padding: '2px 8px',
                                          borderRadius: '5px',
                                          background: 'rgba(59, 130, 246, 0.1)',
                                          color: '#2563eb',
                                          border: '1px solid rgba(59, 130, 246, 0.3)',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title="Xem chi tiết nội dung đơn phúc khảo và ý kiến phản hồi"
                                      >
                                        <i className="fa-solid fa-eye"></i> Xem phúc khảo
                                      </button>

                                      {(activeAppeal.status === 'teacher_rejected' || activeAppeal.status === 'admin_approved_published') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAppealModal(g);
                                            setAppealForm({
                                              gradeId: g._id,
                                              classSectionId: g.classSection?._id || g.classSection || '',
                                              scoreType: 'final',
                                              proposedScore: '',
                                              reason: '',
                                              studentNote: ''
                                            });
                                          }}
                                          style={{
                                            fontSize: '10.5px',
                                            padding: '2px 6px',
                                            borderRadius: '5px',
                                            background: '#f8fafc',
                                            color: '#475569',
                                            border: '1px solid #cbd5e1',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                          }}
                                          title="Nộp đơn phúc khảo mới nếu còn thắc mắc"
                                        >
                                          <i className="fa-solid fa-reply"></i> Nộp lại
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    className="btn btn-sm"
                                    onClick={() => {
                                      setAppealModal(g);
                                      setAppealForm({
                                        gradeId: g._id,
                                        classSectionId: g.classSection?._id || g.classSection || '',
                                        scoreType: 'final',
                                        proposedScore: '',
                                        reason: '',
                                        studentNote: ''
                                      });
                                    }}
                                    style={{
                                      fontSize: '11.5px',
                                      padding: '5px 12px',
                                      borderRadius: '7px',
                                      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                                      color: '#ffffff',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                                      transition: 'all 0.2s ease'
                                    }}
                                    title="Nộp đơn xin phúc khảo điểm học phần này gửi đến Giảng viên xem xét"
                                  >
                                    <i className="fa-solid fa-file-signature"></i> Phúc khảo điểm
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>

        {/* Danh Sách & Tiến Trình Đơn Phúc Khảo Điểm Học Phần Của Sinh Viên */}
        {appeals.length > 0 && (
          <div className="glass-panel" style={{ marginTop: '24px' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>
                <i className="fa-solid fa-file-signature"></i> Tiến Trình & Lịch Sử Đơn Phúc Khảo Điểm ({appeals.length})
              </h3>
            </div>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ngày gửi</th>
                    <th>Môn học</th>
                    <th>Cột điểm</th>
                    <th>Điểm ban đầu</th>
                    <th>Điểm mới</th>
                    <th>Trạng thái</th>
                    <th>Ý kiến của GV & Admin</th>
                    <th style={{ textAlign: 'center' }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {appeals.map((a) => {
                    const scoreTypeLabel = {
                      'final': 'Cuối kỳ (60%)',
                      'midterm': 'Giữa kỳ (30%)',
                      'attendance': 'Chuyên cần (10%)'
                    }[a.scoreType] || a.scoreType;

                    const courseName = a.course?.name || grades.find(g => String(g._id) === String(a.grade))?.course?.name || 'Môn học';

                    const statusMap = {
                      'pending_teacher': { text: '⏳ Chờ GV xem xét', color: '#b45309', bg: '#fef3c7' },
                      'teacher_replied': { text: '💬 GV đã trao đổi', color: '#0369a1', bg: '#e0f2fe' },
                      'teacher_rejected': { text: '❌ GV từ chối', color: '#b91c1c', bg: '#fee2e2' },
                      'teacher_request_unlock': { text: '📤 Đã gửi Admin duyệt', color: '#4338ca', bg: '#e0e7ff' },
                      'admin_unlocked': { text: '✏️ Admin duyệt - Đang chấm lại', color: '#1d4ed8', bg: '#dbeafe' },
                      'teacher_re_submitted': { text: '🔄 Chờ Admin chốt công bố', color: '#6d28d9', bg: '#ede9fe' },
                      'admin_approved_published': { text: '✅ Admin đã duyệt & cập nhật', color: '#047857', bg: '#d1fae5' }
                    };
                    const st = statusMap[a.status] || { text: 'Đang xử lý', color: '#374151', bg: '#f3f4f6' };

                    const displayComment = a.adminComment || a.teacherUnlockRequestReason || a.teacherFeedback;

                    return (
                      <tr key={a._id}>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td><strong>{courseName}</strong></td>
                        <td><span className="badge badge-info">{scoreTypeLabel}</span></td>
                        <td><strong>{a.oldScore}</strong></td>
                        <td>
                          {a.newScore !== null && a.newScore !== undefined ? (
                            <strong style={{ color: '#059669', fontSize: '13px' }}>{a.newScore}</strong>
                          ) : a.proposedScore !== null && a.proposedScore !== undefined ? (
                            <span style={{ color: '#4f46e5', fontSize: '12px' }}>Đề xuất: {a.proposedScore}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            color: st.color,
                            background: st.bg,
                            display: 'inline-block'
                          }}>
                            {st.text}
                          </span>
                        </td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }} title={displayComment || 'Đang xử lý...'}>
                          {displayComment ? (
                            <span style={{ color: '#0f766e', fontWeight: 600 }}>
                              <i className="fa-solid fa-comment-dots"></i> {displayComment}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Đang đợi xem xét...</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setViewAppealDetail({ appeal: a })}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#2563eb',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            <i className="fa-solid fa-eye"></i> Xem
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="glass-panel">
          <div className="panel-header">
            <h3>
              <i className="fa-solid fa-bullhorn"></i> Danh Sách Thông Báo Học Vụ & Giảng Viên
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {announcements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                Không có thông báo mới
              </div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a._id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                      {a.category}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                      <i className="fa-regular fa-clock"></i> {a.date}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '13.5px', color: 'var(--text-main)', marginBottom: '4px' }}>{a.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45' }}>{a.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL GỬI PHẢN HỒI ĐIỂM */}
      {appealModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-color)',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>📝 Nộp Đơn Phúc Khảo Điểm</h3>
                <div style={{ fontSize: '12.5px', opacity: 0.9, marginTop: '3px' }}>
                  {appealModal.course?.name || 'Học phần'} ({appealModal.course?.code || ''})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppealModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                  borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAppeal} style={{ padding: '22px 24px' }}>
              {/* Chọn học phần & Giảng viên */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Chọn học phần & Giảng viên phụ trách <span style={{ color: '#ef4444' }}>*</span>:
                </label>
                <select
                  className="form-control"
                  value={appealForm.gradeId || appealForm.classSectionId}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const selectedG = grades.find(g => String(g._id) === selectedVal) ||
                                      grades.find(g => String(g.classSection?._id || g.classSection) === selectedVal) ||
                                      enrolledSections.find(s => String(s._id) === selectedVal);
                    if (selectedG) {
                      setAppealModal(selectedG);
                      setAppealForm({
                        ...appealForm,
                        gradeId: selectedG._id && grades.some(g => String(g._id) === String(selectedG._id)) ? selectedG._id : '',
                        classSectionId: selectedG.classSection?._id || selectedG._id || ''
                      });
                    }
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13.5px' }}
                >
                  {grades.map(g => (
                    <option key={g._id} value={g._id}>
                      {g.course?.name || 'Môn học'} ({g.course?.code || ''}) — GV: {g.classSection?.teacher?.name || 'Giảng viên'} {g.isPublished ? '' : '(Đang học)'}
                    </option>
                  ))}
                  {enrolledSections
                    .filter(s => !grades.some(g => String(g.classSection?._id || g.classSection) === String(s._id)))
                    .map(s => (
                      <option key={s._id} value={s._id}>
                        {s.course?.name} ({s.course?.code}) — GV: {s.teacher?.name || 'Giảng viên'} (Lớp đang học)
                      </option>
                    ))}
                </select>
                <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '5px', fontWeight: 600 }}>
                  👨‍🏫 Giảng viên tiếp nhận phúc khảo: {appealModal.classSection?.teacher?.name || appealModal.teacher?.name || 'Giảng viên phụ trách'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Chọn thành phần điểm bạn muốn phúc khảo <span style={{ color: '#ef4444' }}>*</span>:
                </label>
                <select
                  className="form-control"
                  value={appealForm.scoreType}
                  onChange={(e) => setAppealForm({ ...appealForm, scoreType: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13.5px' }}
                >
                  <option value="final">Điểm Cuối kỳ (60%) — Điểm hiện tại: {appealModal.finalScore !== undefined ? `${appealModal.finalScore}đ` : 'Chưa có'}</option>
                  <option value="midterm">Điểm Giữa kỳ (30%) — Điểm hiện tại: {appealModal.midtermScore !== undefined ? `${appealModal.midtermScore}đ` : 'Chưa có'}</option>
                  <option value="attendance">Điểm Chuyên cần (10%) — Điểm hiện tại: {appealModal.attendanceScore !== undefined ? `${appealModal.attendanceScore}đ` : 'Chưa có'}</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Điểm bạn tự đánh giá / mong muốn đạt được (tùy chọn, thang 10):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  className="form-control"
                  placeholder="Ví dụ: 8.5"
                  value={appealForm.proposedScore}
                  onChange={(e) => setAppealForm({ ...appealForm, proposedScore: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Lý do / Căn cứ xin phúc khảo điểm <span style={{ color: '#ef4444' }}>*</span>:
                </label>
                <textarea
                  required
                  rows="4"
                  className="form-control"
                  placeholder="Ví dụ: Em chào Thầy/Cô, sau khi đối chiếu bài thi môn này với barem đáp án, em nhận thấy câu 3 phần giải thuật đã làm đúng kết quả nhưng chỉ được 1đ thay vì 2đ. Kính mong Thầy/Cô xem xét và thẩm tra lại bài thi giúp em ạ..."
                  value={appealForm.reason}
                  onChange={(e) => setAppealForm({ ...appealForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Thông tin phòng thi, ca thi, link minh chứng (tùy chọn):
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Phòng thi, ca thi, SĐT liên lạc, link ảnh bài nộp..."
                  value={appealForm.studentNote}
                  onChange={(e) => setAppealForm({ ...appealForm, studentNote: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#475569',
                marginBottom: '20px',
                lineHeight: 1.55
              }}>
                ℹ️ <strong>Quy trình xử lý phúc khảo:</strong> Đơn phúc khảo sẽ được chuyển trực tiếp đến <strong>Giảng viên phụ trách</strong> để xem xét bài thi và thẩm định. Sau đó Giảng viên chuyển ý kiến lên <strong>Ban Quản Lý (Admin)</strong> để ra quyết định kiểm tra lại điểm số và cập nhật điểm chính thức mới lên hệ thống cho bạn.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAppealModal(null)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                  }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal}
                  style={{
                    padding: '9px 22px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '13.5px',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {submittingAppeal ? 'Đang gửi đơn...' : '🚀 Gửi Đơn Phúc Khảo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT PHẢN HỒI & HỘI THOẠI GIẢNG VIÊN */}
      {viewAppealDetail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '88vh'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 22px',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>💬 Hội Thoại Phúc Khảo Điểm</h3>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                  {viewAppealDetail.appeal.course?.name} &mdash;
                  {{
                    'final': ' Cuối kỳ (60%)',
                    'midterm': ' Giữa kỳ (30%)',
                    'attendance': ' Chuyên cần (10%)'
                  }[viewAppealDetail.appeal.scoreType] || ''}
                  &nbsp;&bull; Điểm cũ: <strong>{viewAppealDetail.appeal.oldScore}</strong>
                  {viewAppealDetail.appeal.newScore != null && (
                    <span style={{ marginLeft: 8, color: '#bbf7d0', fontWeight: 700 }}>
                      ➜ Mới: {viewAppealDetail.appeal.newScore}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewAppealDetail(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                  borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Trạng thái */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              {(() => {
                const sm = {
                  'pending_teacher': { text: '⏳ Đang chờ GV xem xét', color: '#b45309', bg: '#fef3c7' },
                  'teacher_replied': { text: '💬 GV đã trao đổi — bạn có thể gửi thêm ý kiến', color: '#0369a1', bg: '#e0f2fe' },
                  'teacher_rejected': { text: '❌ GV từ chối phúc khảo (giữ nguyên điểm)', color: '#b91c1c', bg: '#fee2e2' },
                  'teacher_request_unlock': { text: '📤 GV đã chuyển ý kiến lên Admin xem xét & quyết định', color: '#4338ca', bg: '#e0e7ff' },
                  'admin_unlocked': { text: '✏️ Admin đã chấp thuận — GV đang chấm lại bài', color: '#1d4ed8', bg: '#dbeafe' },
                  'teacher_re_submitted': { text: '🔄 GV đã nộp lại bảng điểm — chờ Admin công bố', color: '#6d28d9', bg: '#ede9fe' },
                  'admin_approved_published': { text: '✅ Admin đã duyệt & cập nhật điểm mới chính thức!', color: '#047857', bg: '#d1fae5' }
                }[viewAppealDetail.appeal.status] || { text: 'Đang xử lý', color: '#374151', bg: '#f3f4f6' };
                return (
                  <span style={{
                    display: 'inline-block', fontSize: '12px', fontWeight: 700,
                    padding: '4px 10px', borderRadius: '8px',
                    color: sm.color, background: sm.bg
                  }}>{sm.text}</span>
                );
              })()}
            </div>

            {/* Quyết định của Admin nếu có */}
            {viewAppealDetail.appeal.adminComment && (
              <div style={{ padding: '10px 20px 8px', flexShrink: 0, borderBottom: '1px dashed var(--border-color)', background: '#f0fdf4' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803d', marginBottom: '3px' }}>
                  ⚖️ Quyết định / Nhận xét của Admin (Ban Quản Lý):
                </div>
                <div style={{ fontSize: '12.5px', color: '#166534', fontWeight: 600 }}>
                  {viewAppealDetail.appeal.adminComment}
                </div>
              </div>
            )}

            {/* Lý do ban đầu */}
            <div style={{ padding: '12px 20px 8px', flexShrink: 0, borderBottom: '1px dashed var(--border-color)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>Lý do bạn đã gửi ban đầu:</div>
              <div style={{ fontSize: '13px', color: '#78350f', background: '#fefce8', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                {viewAppealDetail.appeal.reason}
                {viewAppealDetail.appeal.studentNote && (
                  <div style={{ marginTop: 6, fontSize: '11.5px', color: '#92400e', fontStyle: 'italic' }}>
                    Ghi chú: {viewAppealDetail.appeal.studentNote}
                  </div>
                )}
              </div>
            </div>

            {/* Thread hội thoại */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(!viewAppealDetail.appeal.messages || viewAppealDetail.appeal.messages.length === 0) && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px' }}>
                  <i className="fa-regular fa-comments" style={{ fontSize: 28, marginBottom: 8, display: 'block' }}></i>
                  Chưa có tin nhắn nào trong hội thoại.<br/>
                  <span style={{ fontSize: '12px' }}>Bạn có thể gửi tin nhắn bên dưới.</span>
                </div>
              )}
              {viewAppealDetail.appeal.messages?.map((msg, i) => {
                const isStudent = msg.role === 'student';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isStudent ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '78%',
                      padding: '10px 14px',
                      borderRadius: isStudent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isStudent ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#f1f5f9',
                      color: isStudent ? '#fff' : '#1e293b',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      fontSize: '13px'
                    }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, opacity: 0.7, marginBottom: '3px' }}>
                        {isStudent ? '👨‍🎓 Bạn' : `👨‍🏫 ${msg.sender?.name || 'Giảng viên'}`}
                      </div>
                      <div style={{ lineHeight: 1.55 }}>{msg.content}</div>
                      <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(msg.createdAt).toLocaleDateString('vi-VN') : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ô nhập tin nhắn */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex', gap: '8px', alignItems: 'flex-end',
              flexShrink: 0
            }}>
              <textarea
                rows={2}
                placeholder="Nhập tin nhắn trao đổi tiếp theo cho Giảng viên..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatReply(); } }}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: '10px',
                  border: '1px solid var(--border-color)', fontSize: '13px',
                  resize: 'none', background: 'var(--bg-dark)',
                  color: 'var(--text-main)', outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleSendChatReply}
                disabled={chatSending || !chatText.trim()}
                style={{
                  padding: '9px 16px', borderRadius: '10px', border: 'none',
                  background: chatSending || !chatText.trim() ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#fff', cursor: chatSending || !chatText.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap'
                }}
              >
                {chatSending ? 'Đang gửi...' : '🚀 Gửi'}
              </button>
            </div>

            {/* Nút đóng */}
            <div style={{ padding: '10px 20px 14px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setViewAppealDetail(null)}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: '#f1f5f9', color: '#334155', cursor: 'pointer', fontWeight: 700, fontSize: '13px'
                }}
              >
                Đóng hội thoại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
