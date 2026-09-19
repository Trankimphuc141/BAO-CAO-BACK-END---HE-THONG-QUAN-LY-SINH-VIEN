import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';

const LETTER_COLORS = {
  A: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  'B+': { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  B: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'C+': { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  C: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'D+': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  D: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  F: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }
};

export default function GradeManagement() {
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'appeals'
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [currentClassData, setCurrentClassData] = useState(null);
  const [grades, setGrades] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [toast, setToast] = useState(null);

  // Edit grade modal
  const [editModalGrade, setEditModalGrade] = useState(null);
  const [editForm, setEditForm] = useState({
    attendanceScore: 10,
    midtermScore: 0,
    finalScore: 0,
    teacherComment: '',
    adminNote: ''
  });
  const [savingGrade, setSavingGrade] = useState(false);

  // Action modals
  const [publishModal, setPublishModal] = useState(false);
  const [publishNote, setPublishNote] = useState('');
  const [unlockModal, setUnlockModal] = useState(null); // appeal or class
  const [unlockNote, setUnlockNote] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Appeal filter
  const [appealFilter, setAppealFilter] = useState('all'); // all, unlock_requested, re_submitted, done

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch classes overview
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    const res = await api.getAdminGradeClasses();
    if (res.success && res.data) {
      setClasses(res.data);
      if (!selectedClassId && res.data.length > 0) {
        setSelectedClassId(res.data[0]._id);
      }
    }
    setLoadingClasses(false);
  }, [selectedClassId]);

  // Fetch appeals
  const fetchAppeals = useCallback(async () => {
    const res = await api.getAdminAppeals();
    if (res.success && res.data) {
      setAppeals(res.data);
    }
  }, []);

  // Fetch selected class detail
  const fetchClassGrades = useCallback(async (classId) => {
    if (!classId) return;
    setLoading(true);
    const res = await api.getAdminClassGrades(classId);
    if (res.success && res.data) {
      setCurrentClassData(res.data.classSection);
      setGrades(res.data.grades || []);
    } else {
      showToast(res.message || 'Lỗi khi tải bảng điểm', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchAppeals();
  }, [fetchClasses, fetchAppeals]);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassGrades(selectedClassId);
    }
  }, [selectedClassId, fetchClassGrades]);

  // Auto-sync on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchClasses();
      fetchAppeals();
      if (selectedClassId) {
        fetchClassGrades(selectedClassId);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedClassId, fetchClasses, fetchAppeals, fetchClassGrades]);

  // Calculations for quick statistics
  const stats = useMemo(() => {
    const waitingReview = classes.filter(c => c.submissionStatus === 'submitted').length;
    const published = classes.filter(c => c.isPublished).length;
    const unlockRequests = appeals.filter(a => a.status === 'teacher_request_unlock').length;
    const reSubmitted = appeals.filter(a => a.status === 'teacher_re_submitted').length;
    return { waitingReview, published, unlockRequests, reSubmitted };
  }, [classes, appeals]);

  // Handlers
  const handleOpenEdit = (grade) => {
    setEditModalGrade(grade);
    setEditForm({
      attendanceScore: grade.attendanceScore ?? 10,
      midtermScore: grade.midtermScore ?? 0,
      finalScore: grade.finalScore ?? 0,
      teacherComment: grade.teacherComment || '',
      adminNote: ''
    });
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!editModalGrade) return;
    setSavingGrade(true);
    const res = await api.adminUpdateGrade(editModalGrade._id, editForm);
    setSavingGrade(false);
    if (res.success) {
      showToast('✅ Cập nhật điểm sinh viên thành công!');
      setEditModalGrade(null);
      fetchClassGrades(selectedClassId);
      fetchClasses();
    } else {
      showToast(res.message || 'Lỗi khi cập nhật điểm', 'error');
    }
  };

  const handlePublishSubmit = async () => {
    if (!selectedClassId) return;
    setProcessingAction(true);
    const res = await api.adminPublishGrades(selectedClassId, publishNote);
    setProcessingAction(false);
    if (res.success) {
      showToast('🎉 Đã công bố điểm chính thức tới Sinh viên và Giảng viên!');
      setPublishModal(false);
      setPublishNote('');
      fetchClassGrades(selectedClassId);
      fetchClasses();
      fetchAppeals();
    } else {
      showToast(res.message || 'Lỗi khi công bố điểm', 'error');
    }
  };

  const handleUnlockSubmit = async () => {
    if (!unlockModal) return;
    setProcessingAction(true);
    const classId = unlockModal.classSection?._id || unlockModal.classSection || selectedClassId;
    const appealId = unlockModal._id || null;
    const res = await api.adminUnlockGrade(classId, appealId, unlockNote);
    setProcessingAction(false);
    if (res.success) {
      showToast('🔓 Đã duyệt mở khóa bảng điểm cho Giảng viên!');
      setUnlockModal(null);
      setUnlockNote('');
      fetchClasses();
      fetchAppeals();
      if (selectedClassId === classId) {
        fetchClassGrades(selectedClassId);
      }
    } else {
      showToast(res.message || 'Lỗi khi mở khóa bảng điểm', 'error');
    }
  };

  const handleSyncSection = async () => {
    if (!selectedClassId) return;
    setSyncing(true);
    const res = await api.adminSyncSectionGrades(selectedClassId);
    setSyncing(false);
    if (res.success) {
      showToast(`✅ ${res.message || 'Đồng bộ điểm lớp thành công!'}`);
      fetchClassGrades(selectedClassId);
      fetchClasses();
    } else {
      showToast(res.message || 'Lỗi khi đồng bộ điểm lớp', 'error');
    }
  };

  const handleSyncAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đồng bộ toàn bộ dữ liệu điểm và chuyên cần cho tất cả các lớp học phần trong hệ thống?')) return;
    setSyncing(true);
    const res = await api.adminSyncAllGrades();
    setSyncing(false);
    if (res.success) {
      showToast(`🎉 ${res.message}`);
      fetchClasses();
      if (selectedClassId) fetchClassGrades(selectedClassId);
    } else {
      showToast(res.message || 'Lỗi khi đồng bộ toàn hệ thống', 'error');
    }
  };

  // Preview score inside modal
  const previewScore = useMemo(() => {
    const att = Number(editForm.attendanceScore) || 0;
    const mid = Number(editForm.midtermScore) || 0;
    const fin = Number(editForm.finalScore) || 0;
    return +(att * 0.1 + mid * 0.3 + fin * 0.6).toFixed(2);
  }, [editForm.attendanceScore, editForm.midtermScore, editForm.finalScore]);

  // Filtered appeals
  const filteredAppeals = useMemo(() => {
    if (appealFilter === 'unlock_requested') {
      return appeals.filter(a => a.status === 'teacher_request_unlock');
    }
    if (appealFilter === 're_submitted') {
      return appeals.filter(a => a.status === 'teacher_re_submitted');
    }
    if (appealFilter === 'done') {
      return appeals.filter(a => a.status === 'admin_approved_published');
    }
    return appeals;
  }, [appeals, appealFilter]);

  const selectedClass = classes.find(c => c._id === selectedClassId);

  return (
    <div className="page-container fade-in" style={{ padding: '24px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '14px 22px', borderRadius: '10px',
          fontWeight: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
        borderRadius: '16px', padding: '28px 32px', color: 'white',
        boxShadow: '0 12px 30px rgba(37,99,235,0.25)', marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', width: '42px', height: '42px',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>
                <i className="fa-solid fa-award"></i>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Quản Lý & Duyệt Điểm Thi</h1>
            </div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
              Kiểm tra điểm từ Giảng viên gửi lên, chỉnh sửa điểm, công bố điểm chính thức, phê duyệt mở khóa phúc khảo.
            </p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)',
              padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.25)'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{stats.waitingReview}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Chờ duyệt điểm</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)',
              padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.25)'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{stats.unlockRequests}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Yêu cầu mở khóa</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)',
              padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.25)'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{stats.reSubmitted}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Điểm PK nộp lại</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)',
              padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.25)'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{stats.published}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Đã công bố</div>
            </div>

            {/* Sync All Button */}
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              style={{
                background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.4)',
                color: 'white', padding: '10px 18px', borderRadius: '10px', fontWeight: 700,
                cursor: syncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
                backdropFilter: 'blur(10px)', transition: 'all 0.2s'
              }}
              title="Đồng bộ điểm và chuyên cần cho toàn bộ các lớp trong trường"
            >
              <i className={`fa-solid fa-arrows-rotate ${syncing ? 'fa-spin' : ''}`}></i>
              <span>{syncing ? 'Đang đồng bộ...' : 'Đồng Bộ Toàn Hệ Thống'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('review')}
          style={{
            padding: '12px 24px', border: 'none', background: 'none',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            borderBottom: activeTab === 'review' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'review' ? '#2563eb' : '#64748b',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-list-check"></i>
          <span>Duyệt & Công Bố Bảng Điểm</span>
          {stats.waitingReview > 0 && (
            <span style={{
              background: '#ef4444', color: 'white', padding: '2px 8px',
              borderRadius: '20px', fontSize: '11px', fontWeight: 800
            }}>
              {stats.waitingReview}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('appeals')}
          style={{
            padding: '12px 24px', border: 'none', background: 'none',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            borderBottom: activeTab === 'appeals' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'appeals' ? '#2563eb' : '#64748b',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-scale-balanced"></i>
          <span>Yêu Cầu Mở Khóa & Phúc Khảo</span>
          {(stats.unlockRequests > 0 || stats.reSubmitted > 0) && (
            <span style={{
              background: '#f59e0b', color: 'white', padding: '2px 8px',
              borderRadius: '20px', fontSize: '11px', fontWeight: 800
            }}>
              {stats.unlockRequests + stats.reSubmitted}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DUYỆT & CÔNG BỐ BẢNG ĐIỂM */}
      {activeTab === 'review' && (
        <div>
          {/* Section Selector Card */}
          <div style={{
            background: 'white', borderRadius: '12px', padding: '20px 24px',
            border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 350px' }}>
                <label style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                  Lớp học phần:
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  style={{
                    padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1',
                    fontSize: '14px', fontWeight: 600, color: '#0f172a', width: '100%', maxWidth: '420px',
                    outline: 'none', background: '#f8fafc'
                  }}
                >
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.sectionCode} — {c.courseName} ({c.teacherName})
                      {c.submissionStatus === 'submitted' ? ' ⏳ [Chờ duyệt]' : ''}
                      {c.isPublished ? ' ✅ [Đã công bố]' : ''}
                      {c.unlockStatus === 'requested_unlock' ? ' 🔓 [Xin mở khóa]' : ''}
                      {c.submissionStatus === 're_submitted' ? ' 🔄 [Nộp lại PK]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status and Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {selectedClass?.unlockStatus === 'requested_unlock' && (
                  <button
                    onClick={() => {
                      setUnlockModal(selectedClass);
                      setUnlockNote(`Duyệt mở khóa bảng điểm theo yêu cầu của GV ${selectedClass.teacherName}`);
                    }}
                    style={{
                      background: '#d97706', color: 'white', border: 'none',
                      padding: '10px 18px', borderRadius: '8px', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    <i className="fa-solid fa-lock-open"></i> Duyệt Mở Khóa Cho GV
                  </button>
                )}

                {selectedClass?.unlockStatus === 'unlocked_for_edit' && (
                  <span style={{
                    background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a',
                    padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '13px'
                  }}>
                    🔓 Đang mở khóa cho GV sửa điểm
                  </span>
                )}

                {/* Section Sync Button */}
                <button
                  onClick={handleSyncSection}
                  disabled={syncing || !selectedClassId}
                  style={{
                    background: '#f8fafc', color: '#2563eb', border: '1.5px solid #bfdbfe',
                    padding: '10px 16px', borderRadius: '8px', fontWeight: 700,
                    cursor: syncing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
                  }}
                  title="Đồng bộ điểm chuyên cần từ 15 buổi điểm danh sang bảng điểm lớp này"
                >
                  <i className={`fa-solid fa-rotate ${syncing ? 'fa-spin' : ''}`}></i>
                  <span>{syncing ? 'Đang đồng bộ...' : 'Đồng Bộ Điểm Danh'}</span>
                </button>

                {/* Publish Button */}
                <button
                  onClick={() => {
                    setPublishModal(true);
                    setPublishNote('');
                  }}
                  disabled={grades.length === 0}
                  style={{
                    background: selectedClass?.isPublished ? '#059669' : '#2563eb',
                    color: 'white', border: 'none',
                    padding: '10px 20px', borderRadius: '8px', fontWeight: 700,
                    cursor: grades.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                  }}
                >
                  <i className="fa-solid fa-bullhorn"></i>
                  {selectedClass?.isPublished ? '📢 Cập Nhật & Công Bố Lại Điểm' : '📢 Chốt & Công Bố Điểm'}
                </button>
              </div>
            </div>

            {/* Current Class Info Badges */}
            {currentClassData && (
              <div style={{
                display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '16px',
                borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', alignItems: 'center'
              }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  <strong>Giảng viên:</strong> {currentClassData.teacher?.name || '—'} ({currentClassData.teacher?.code})
                </span>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  <strong>Môn học:</strong> {currentClassData.course?.name} ({currentClassData.course?.code})
                </span>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  <strong>Số tín chỉ:</strong> {currentClassData.course?.credits}
                </span>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  <strong>Phòng học:</strong> {currentClassData.room}
                </span>
                <span style={{
                  fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px',
                  background: selectedClass?.isPublished ? '#ecfdf5' : '#eff6ff',
                  color: selectedClass?.isPublished ? '#059669' : '#2563eb',
                  border: `1px solid ${selectedClass?.isPublished ? '#a7f3d0' : '#bfdbfe'}`
                }}>
                  {selectedClass?.isPublished ? '● Đã công bố điểm' : '● Chưa công bố điểm'}
                </span>
              </div>
            )}
          </div>

          {/* Grades Table */}
          <div style={{
            background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                Bảng Điểm Lớp Học Phần ({grades.length} sinh viên)
              </h3>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Admin có quyền kiểm tra, sửa trực tiếp bất kỳ cột điểm nào trước hoặc sau khi công bố.
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                <div>Đang tải dữ liệu điểm...</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Mã SV</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Họ và tên</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Chuyên cần (10%)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Giữa kỳ (30%)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Cuối kỳ (60%)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>TK (Hệ 10)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Điểm Chữ</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Kết Quả</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Nhận xét</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g) => {
                      const lc = LETTER_COLORS[g.letterGrade] || {};
                      return (
                        <tr key={g._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                            {g.student?.code}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                            {g.student?.name}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                            {g.attendanceScore}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                            {g.midtermScore}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                            {g.finalScore}
                          </td>
                          <td style={{
                            padding: '12px 14px', textAlign: 'center', fontWeight: 800, fontSize: '15px',
                            color: g.isPassed ? '#059669' : '#dc2626'
                          }}>
                            {g.totalScore10}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 10px', borderRadius: '6px',
                              fontWeight: 800, fontSize: '12px',
                              background: lc.bg || '#f1f5f9', color: lc.color || '#334155',
                              border: `1px solid ${lc.border || '#cbd5e1'}`
                            }}>
                              {g.letterGrade}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: '6px',
                              fontSize: '12px', fontWeight: 700,
                              background: g.isPassed ? '#ecfdf5' : '#fef2f2',
                              color: g.isPassed ? '#059669' : '#dc2626'
                            }}>
                              {g.isPassed ? 'Đạt' : 'Rớt'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px', maxWidth: '180px' }}>
                            {g.teacherComment || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleOpenEdit(g)}
                              style={{
                                background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                              }}
                            >
                              <i className="fa-solid fa-pen-to-square"></i> Sửa Điểm
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {grades.length === 0 && (
                      <tr>
                        <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                          <i className="fa-solid fa-folder-open" style={{ fontSize: '36px', marginBottom: '12px' }}></i>
                          <div>Lớp này chưa có bản ghi điểm nào được khởi tạo.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: YÊU CẦU MỞ KHÓA & PHÚC KHẢO */}
      {activeTab === 'appeals' && (
        <div>
          {/* Filters Bar */}
          <div style={{
            background: 'white', borderRadius: '12px', padding: '16px 24px',
            border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `Tất cả (${appeals.length})` },
                { id: 'unlock_requested', label: `Yêu cầu mở khóa (${stats.unlockRequests})` },
                { id: 're_submitted', label: `GV nộp lại sau PK (${stats.reSubmitted})` },
                { id: 'done', label: 'Đã hoàn tất công bố' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAppealFilter(f.id)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    border: '1px solid',
                    borderColor: appealFilter === f.id ? '#2563eb' : '#e2e8f0',
                    background: appealFilter === f.id ? '#eff6ff' : 'white',
                    color: appealFilter === f.id ? '#2563eb' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchAppeals()}
              style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 14px',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#475569',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <i className="fa-solid fa-rotate"></i> Làm mới
            </button>
          </div>

          {/* Appeals List Table */}
          <div style={{
            background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Sinh viên</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Lớp & Môn học</th>
                    <th style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Mục phúc khảo</th>
                    <th style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Điểm cũ</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Lý do SV & Đề xuất GV</th>
                    <th style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Trạng thái</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppeals.map((appeal) => {
                    const isUnlockRequested = appeal.status === 'teacher_request_unlock';
                    const isReSubmitted = appeal.status === 'teacher_re_submitted';

                    return (
                      <tr key={appeal._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{appeal.student?.name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{appeal.student?.code}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#2563eb' }}>{appeal.classSection?.sectionCode}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{appeal.course?.name}</div>
                          <div style={{ fontSize: '12px', color: '#475569' }}>GV: {appeal.teacher?.name}</div>
                        </td>
                        <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                            background: appeal.scoreType === 'final' ? '#eff6ff' : '#fdf4ff',
                            color: appeal.scoreType === 'final' ? '#2563eb' : '#a21caf',
                            border: `1px solid ${appeal.scoreType === 'final' ? '#bfdbfe' : '#f5d0fe'}`
                          }}>
                            {appeal.scoreType === 'midterm' ? 'Giữa kỳ' : appeal.scoreType === 'final' ? 'Cuối kỳ' : 'Chuyên cần'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 800, fontSize: '15px', color: '#dc2626' }}>
                          {appeal.oldScore}
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                          <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                            <strong>SV:</strong> {appeal.reason}
                          </div>
                          {appeal.teacherUnlockRequestReason && (
                            <div style={{ fontSize: '12px', color: '#d97706', background: '#fffbeb', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                              <strong>GV đề xuất mở khóa:</strong> {appeal.teacherUnlockRequestReason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                          {appeal.status === 'pending_teacher' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
                              Chờ GV xử lý
                            </span>
                          )}
                          {appeal.status === 'teacher_replied' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: '#eff6ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
                              💬 GV đã trả lời SV
                            </span>
                          )}
                          {appeal.status === 'teacher_request_unlock' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}>
                              📤 GV gửi ý kiến - Chờ Admin xem
                            </span>
                          )}
                          {appeal.status === 'admin_unlocked' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                              🔓 Đã mở khóa - GV đang chấm
                            </span>
                          )}
                          {appeal.status === 'teacher_re_submitted' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>
                              🔄 GV nộp lại - Chờ Admin công bố
                            </span>
                          )}
                          {appeal.status === 'admin_approved_published' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                              ✅ Đã công bố điểm mới
                            </span>
                          )}
                          {appeal.status === 'teacher_rejected' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                              GV từ chối
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {isUnlockRequested && (
                            <button
                              onClick={() => {
                                setUnlockModal(appeal);
                                setUnlockNote(`Đồng ý mở khóa bảng điểm cho GV ${appeal.teacher?.name} xử lý phúc khảo SV ${appeal.student?.name}`);
                              }}
                              style={{
                                background: '#d97706', color: 'white', border: 'none',
                                padding: '8px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '12px',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                              }}
                            >
                              <i className="fa-solid fa-lock-open"></i> Mở Khóa Cho GV
                            </button>
                          )}

                          {isReSubmitted && (
                            <button
                              onClick={() => {
                                setSelectedClassId(appeal.classSection?._id || appeal.classSection);
                                setActiveTab('review');
                                setPublishModal(true);
                                setPublishNote(`Công bố điểm mới sau phúc khảo cho môn ${appeal.course?.name}`);
                              }}
                              style={{
                                background: '#7e22ce', color: 'white', border: 'none',
                                padding: '8px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '12px',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                              }}
                            >
                              <i className="fa-solid fa-bullhorn"></i> Công Bố Điểm Mới
                            </button>
                          )}

                          {!isUnlockRequested && !isReSubmitted && (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAppeals.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                        <i className="fa-solid fa-inbox" style={{ fontSize: '36px', marginBottom: '12px' }}></i>
                        <div>Không có đơn phúc khảo nào trong danh mục này.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN SỬA ĐIỂM SINH VIÊN */}
      {editModalGrade && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', maxWidth: '520px', width: '100%',
            overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                  Admin Điều Chỉnh Điểm Sinh Viên
                </h3>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  {editModalGrade.student?.name} — {editModalGrade.student?.code}
                </div>
              </div>
              <button
                onClick={() => setEditModalGrade(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGrade} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Chuyên cần (10%)
                  </label>
                  <input
                    type="number" step="0.1" min="0" max="10" required
                    value={editForm.attendanceScore}
                    onChange={(e) => setEditForm({ ...editForm, attendanceScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 700, textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Giữa kỳ (30%)
                  </label>
                  <input
                    type="number" step="0.1" min="0" max="10" required
                    value={editForm.midtermScore}
                    onChange={(e) => setEditForm({ ...editForm, midtermScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 700, textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Cuối kỳ (60%)
                  </label>
                  <input
                    type="number" step="0.1" min="0" max="10" required
                    value={editForm.finalScore}
                    onChange={(e) => setEditForm({ ...editForm, finalScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 700, textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Preview Box */}
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>Điểm Tổng Kết (Hệ 10) Tạm Tính:</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: previewScore >= 5 ? '#15803d' : '#dc2626' }}>
                    {previewScore} / 10
                  </div>
                </div>
                <span style={{
                  padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '14px',
                  background: previewScore >= 5 ? '#dcfce7' : '#fee2e2',
                  color: previewScore >= 5 ? '#15803d' : '#991b1b'
                }}>
                  {previewScore >= 5 ? 'ĐẠT HỌC PHẦN' : 'RỚT HỌC PHẦN'}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Ghi chú / Nhận xét của Giảng viên:
                </label>
                <input
                  type="text"
                  value={editForm.teacherComment}
                  onChange={(e) => setEditForm({ ...editForm, teacherComment: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Lý do / Căn cứ điều chỉnh của Admin:
                </label>
                <input
                  type="text"
                  placeholder="VD: Điều chỉnh theo quyết định phúc khảo số 12/QĐ-ĐT..."
                  value={editForm.adminNote}
                  onChange={(e) => setEditForm({ ...editForm, adminNote: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditModalGrade(null)}
                  style={{
                    padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  style={{
                    padding: '10px 22px', borderRadius: '8px', border: 'none',
                    background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  {savingGrade ? 'Đang lưu...' : 'Lưu Điểm Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CÔNG BỐ ĐIỂM */}
      {publishModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%',
            padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                background: '#eff6ff', color: '#2563eb', width: '44px', height: '44px',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>
                <i className="fa-solid fa-bullhorn"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Chốt & Công Bố Điểm Thi</h3>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{selectedClass?.courseName} ({selectedClass?.sectionCode})</div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '16px' }}>
              Sau khi Admin công bố, toàn bộ <strong>sinh viên</strong> trong lớp sẽ lập tức nhìn thấy bảng điểm chính thức trong Cổng sinh viên và Giảng viên cũng sẽ nhận được thông báo hoàn tất công bố điểm.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Thông báo kèm theo (tùy chọn):
              </label>
              <input
                type="text"
                placeholder="VD: Điểm thi học kỳ chính thức đã được Phòng Đào tạo duyệt và công bố..."
                value={publishNote}
                onChange={(e) => setPublishNote(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setPublishModal(false)}
                style={{
                  padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handlePublishSubmit}
                disabled={processingAction}
                style={{
                  padding: '10px 22px', borderRadius: '8px', border: 'none',
                  background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {processingAction ? 'Đang xử lý...' : 'Xác Nhận Công Bố'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN DUYỆT MỞ KHÓA BẢNG ĐIỂM */}
      {unlockModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%',
            padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                background: '#fffbeb', color: '#d97706', width: '44px', height: '44px',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>
                <i className="fa-solid fa-lock-open"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#92400e' }}>
                  Duyệt Mở Khóa Bảng Điểm
                </h3>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Cấp quyền cho Giảng viên chỉnh sửa điểm phúc khảo
                </div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '16px' }}>
              Khi duyệt mở khóa, giảng viên phụ trách sẽ có quyền vào bảng điểm để sửa điểm cho sinh viên phúc khảo. Sau khi sửa xong, giảng viên sẽ nộp lại bảng điểm để Admin kiểm tra và công bố mới.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Lời nhắn của Admin gửi Giảng viên:
              </label>
              <textarea
                rows={3}
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setUnlockModal(null)}
                style={{
                  padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleUnlockSubmit}
                disabled={processingAction}
                style={{
                  padding: '10px 22px', borderRadius: '8px', border: 'none',
                  background: '#d97706', color: 'white', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {processingAction ? 'Đang xử lý...' : 'Xác Nhận Mở Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
