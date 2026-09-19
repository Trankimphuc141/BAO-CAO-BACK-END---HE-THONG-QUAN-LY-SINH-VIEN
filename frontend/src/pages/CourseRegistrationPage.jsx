import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const SEMESTER_OPTIONS = [
  'HK1-2026-2027',
  'HK2-2026-2027',
  'HK3-2026-2027 (Hè)'
];

export default function CourseRegistrationPage({ currentUser }) {
  const [selectedSemester, setSelectedSemester] = useState('HK1-2026-2027');
  const [availableSections, setAvailableSections] = useState([]);
  const [mySections, setMySections] = useState([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('available'); // 'available' | 'registered'

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [availRes, myRes] = await Promise.all([
        api.getAvailableSections(selectedSemester),
        api.getMyRegisteredSections(selectedSemester)
      ]);

      if (availRes.success) setAvailableSections(availRes.data || []);
      if (myRes.success) {
        setMySections(myRes.data || []);
        setTotalCredits(myRes.totalCredits || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu đăng ký:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSemester]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Đăng ký học phần
  const handleRegister = async (sec) => {
    setSubmittingId(sec._id);
    const res = await api.registerSection(sec._id);
    setSubmittingId(null);

    if (res.success) {
      showToast(res.message || 'Đăng ký học phần thành công!');
      loadData();
    } else {
      showToast(res.message || 'Đăng ký thất bại', 'error');
    }
  };

  // Hủy học phần
  const handleDrop = async (sec) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy học phần "${sec.course?.name}" (${sec.sectionCode})?`)) return;
    setSubmittingId(sec._id);
    const res = await api.dropSection(sec._id);
    setSubmittingId(null);

    if (res.success) {
      showToast(res.message || 'Hủy học phần thành công!');
      loadData();
    } else {
      showToast(res.message || 'Hủy học phần thất bại', 'error');
    }
  };

  const registeredSectionIds = new Set(mySections.map(s => s._id));

  return (
    <div className="tab-pane active" style={{ animation: 'fadeUp 0.3s ease-out', position: 'relative' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 999999,
          background: toast.type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff', padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600
        }}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div style={{
        marginBottom: '24px', padding: '24px',
        background: '#ffffff',
        borderRadius: '18px', border: '1px solid rgba(226,232,240,0.9)',
        boxShadow: '0 4px 20px rgba(15,23,42,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', color: '#fff', boxShadow: '0 8px 20px rgba(37,99,235,0.25)'
            }}>
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a', letterSpacing: '-0.3px' }}>
                Đăng Ký & Hủy Học Phần Trực Tuyến
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Đăng ký các lớp học phần đang mở trong kỳ và quản lý số tín chỉ tích lũy.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Học Kỳ:</span>
              <select
                value={selectedSemester}
                onChange={e => setSelectedSemester(e.target.value)}
                style={{
                  background: '#f8fafc', border: '1.5px solid #cbd5e1',
                  color: '#0f172a', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700,
                  outline: 'none', cursor: 'pointer'
                }}
              >
                {SEMESTER_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Thẻ hiển thị tổng số tín chỉ tích lũy */}
            <div style={{
              padding: '10px 18px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
              border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ fontSize: '12.5px', color: '#1e40af', fontWeight: 600 }}>Đã Đăng Ký:</span>
              <strong style={{ fontSize: '16px', color: '#2563eb', fontWeight: 800 }}>{totalCredits} Tín chỉ</strong>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>({mySections.length} Lớp)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('available')}
          style={{
            padding: '11px 20px', borderRadius: '12px', border: activeSubTab === 'available' ? 'none' : '1px solid #cbd5e1',
            cursor: 'pointer', fontSize: '13.5px', fontWeight: 700, transition: 'all 0.2s',
            background: activeSubTab === 'available' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#ffffff',
            color: activeSubTab === 'available' ? '#ffffff' : '#475569',
            boxShadow: activeSubTab === 'available' ? '0 6px 18px rgba(37,99,235,0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-folder-plus"></i>
          Lớp Đang Mở Đăng Ký ({availableSections.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('registered')}
          style={{
            padding: '11px 20px', borderRadius: '12px', border: activeSubTab === 'registered' ? 'none' : '1px solid #cbd5e1',
            cursor: 'pointer', fontSize: '13.5px', fontWeight: 700, transition: 'all 0.2s',
            background: activeSubTab === 'registered' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#ffffff',
            color: activeSubTab === 'registered' ? '#ffffff' : '#475569',
            boxShadow: activeSubTab === 'registered' ? '0 6px 18px rgba(37,99,235,0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-clipboard-check"></i>
          Học Phần Đã Đăng Ký ({mySections.length})
        </button>
      </div>

      {/* TAB 1: DANH SÁCH LỚP HỌC PHẦN ĐANG MỞ */}
      {activeSubTab === 'available' && (
        <div style={{
          background: '#ffffff', border: '1px solid rgba(226,232,240,0.9)',
          borderRadius: '18px', padding: '8px', overflowX: 'auto',
          boxShadow: '0 4px 20px rgba(15,23,42,0.04)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 16px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>Mã Lớp HP</th>
                <th style={{ padding: '14px 16px' }}>Môn Học</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Số Tín Chỉ</th>
                <th style={{ padding: '14px 16px' }}>Giảng Viên</th>
                <th style={{ padding: '14px 16px' }}>Thời Khóa Biểu</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Sĩ Số</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: '#2563eb', marginBottom: '10px', display: 'block' }}></i>
                    Đang tải danh sách học phần...
                  </td>
                </tr>
              ) : availableSections.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '56px', color: '#64748b' }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', color: '#94a3b8' }}></i>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>Không có lớp học phần nào đang mở</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Vui lòng chọn học kỳ khác hoặc quay lại sau.</div>
                  </td>
                </tr>
              ) : (
                availableSections.map(sec => {
                  const isRegistered = registeredSectionIds.has(sec._id);
                  const studentCount = sec.students?.length || 0;
                  const isFull = studentCount >= (sec.maxStudents || 50);

                  return (
                    <tr key={sec._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {sec.sectionCode}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{sec.course?.name}</div>
                        <span style={{ fontSize: '11.5px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                          {sec.course?.code}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '12px',
                          background: '#e0e7ff', color: '#3730a3',
                          fontWeight: 800, fontSize: '12.5px'
                        }}>
                          {sec.course?.credits || 3} Tín chỉ
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13.5px', fontWeight: 600 }}>
                        {sec.teacher?.name || 'Giảng viên khoa'}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          Thứ {sec.dayOfWeek === 8 ? 'CN' : sec.dayOfWeek} — {sec.shift}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                          Phòng {sec.room}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: isFull ? '#ef4444' : '#059669' }}>
                        {studentCount} / {sec.maxStudents || 50}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isRegistered ? (
                          <span style={{
                            padding: '6px 14px', borderRadius: '10px',
                            background: '#dcfce7', color: '#15803d',
                            fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}>
                            <i className="fa-solid fa-circle-check"></i> Đã Đăng Ký
                          </span>
                        ) : isFull ? (
                          <span style={{
                            padding: '6px 14px', borderRadius: '10px',
                            background: '#fee2e2', color: '#b91c1c',
                            fontSize: '12px', fontWeight: 700
                          }}>
                            Hết Chỗ
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRegister(sec)}
                            disabled={submittingId === sec._id}
                            style={{
                              padding: '8px 18px', borderRadius: '10px', border: 'none',
                              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                              color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(37,99,235,0.25)', transition: 'all 0.2s'
                            }}
                          >
                            {submittingId === sec._id ? 'Đang xử lý...' : 'Đăng Ký'}
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
      )}

      {/* TAB 2: DANH SÁCH HỌC PHẦN ĐÃ ĐĂNG KÝ */}
      {activeSubTab === 'registered' && (
        <div style={{
          background: '#ffffff', border: '1px solid rgba(226,232,240,0.9)',
          borderRadius: '18px', padding: '8px', overflowX: 'auto',
          boxShadow: '0 4px 20px rgba(15,23,42,0.04)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 16px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>Mã Lớp HP</th>
                <th style={{ padding: '14px 16px' }}>Môn Học</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Số Tín Chỉ</th>
                <th style={{ padding: '14px 16px' }}>Giảng Viên</th>
                <th style={{ padding: '14px 16px' }}>Lịch Học</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>Hủy Học Phần</th>
              </tr>
            </thead>
            <tbody>
              {mySections.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '56px', color: '#64748b' }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <i className="fa-solid fa-clipboard-question" style={{ fontSize: '24px', color: '#94a3b8' }}></i>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>Bạn chưa đăng ký học phần nào</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Chuyển sang tab "Lớp Đang Mở Đăng Ký" để xem danh sách môn học.</div>
                  </td>
                </tr>
              ) : (
                mySections.map(sec => (
                  <tr key={sec._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                      {sec.sectionCode}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{sec.course?.name}</div>
                      <span style={{ fontSize: '11.5px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                        {sec.course?.code}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '12px',
                        background: '#e0e7ff', color: '#3730a3',
                        fontWeight: 800, fontSize: '12.5px'
                      }}>
                        {sec.course?.credits || 3} Tín chỉ
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13.5px', fontWeight: 600 }}>
                      {sec.teacher?.name || 'Giảng viên khoa'}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        Thứ {sec.dayOfWeek === 8 ? 'CN' : sec.dayOfWeek} — {sec.shift}
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                        Phòng {sec.room}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDrop(sec)}
                        disabled={submittingId === sec._id}
                        style={{
                          padding: '7px 16px', borderRadius: '10px', border: '1px solid #fecaca',
                          background: '#fef2f2', color: '#dc2626',
                          fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                        }}
                      >
                        <i className="fa-solid fa-trash-can"></i> Hủy Môn
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
