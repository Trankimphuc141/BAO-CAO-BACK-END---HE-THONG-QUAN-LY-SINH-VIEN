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
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px'
        }}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="section-card" style={{
        marginBottom: '24px', padding: '24px',
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
        borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', color: '#fff', boxShadow: '0 8px 20px rgba(16,185,129,0.3)'
            }}>
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#fff' }}>
                Đăng Ký & Hủy Học Phần Trực Tuyến
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                Đăng ký các lớp học phần đang mở trong kỳ và quản lý số tín chỉ tích lũy.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)' }}>Học Kỳ:</span>
              <select
                value={selectedSemester}
                onChange={e => setSelectedSemester(e.target.value)}
                style={{
                  background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 700
                }}
              >
                {SEMESTER_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Thẻ hiển thị tổng số tín chỉ tích lũy */}
            <div style={{
              padding: '8px 16px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(147,197,253,0.3)', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.8)' }}>Đã Đăng Ký:</span>
              <strong style={{ fontSize: '16px', color: '#60a5fa' }}>{totalCredits} Tín chỉ</strong>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>({mySections.length} Lớp)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('available')}
          style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontSize: '13.5px', fontWeight: 700, transition: 'all 0.2s',
            background: activeSubTab === 'available' ? '#2563eb' : 'rgba(255,255,255,0.06)',
            color: '#fff', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-folder-plus"></i>
          Lớp Đang Mở Đăng Ký ({availableSections.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('registered')}
          style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontSize: '13.5px', fontWeight: 700, transition: 'all 0.2s',
            background: activeSubTab === 'registered' ? '#2563eb' : 'rgba(255,255,255,0.06)',
            color: '#fff', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-clipboard-check"></i>
          Học Phần Đã Đăng Ký ({mySections.length})
        </button>
      </div>

      {/* TAB 1: DANH SÁCH LỚP HỌC PHẦN ĐANG MỞ */}
      {activeSubTab === 'available' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', padding: '20px', overflowX: 'auto'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Mã Lớp HP</th>
                <th style={{ padding: '12px 14px' }}>Môn Học</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Số Tín Chỉ</th>
                <th style={{ padding: '12px 14px' }}>Giảng Viên</th>
                <th style={{ padding: '12px 14px' }}>Thời Khóa Biểu</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Sĩ Số</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>Đang tải danh sách học phần...</td></tr>
              ) : availableSections.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                    Không có lớp học phần nào đang mở đăng ký trong học kỳ này.
                  </td>
                </tr>
              ) : (
                availableSections.map(sec => {
                  const isRegistered = registeredSectionIds.has(sec._id);
                  const studentCount = sec.students?.length || 0;
                  const isFull = studentCount >= (sec.maxStudents || 50);

                  return (
                    <tr key={sec._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '14px', fontFamily: 'monospace', fontWeight: 800, color: '#60a5fa' }}>
                        {sec.sectionCode}
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{sec.course?.name}</div>
                        <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                          {sec.course?.code}
                        </span>
                      </td>

                      {/* Hiển thị số tín chỉ đồng bộ */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px',
                          background: 'rgba(59,130,246,0.2)', color: '#93c5fd',
                          fontWeight: 800, fontSize: '12.5px'
                        }}>
                          {sec.course?.credits || 3} Tín chỉ
                        </span>
                      </td>

                      <td style={{ padding: '14px', color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                        {sec.teacher?.name || 'Giảng viên khoa'}
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>
                          Thứ {sec.dayOfWeek === 8 ? 'CN' : sec.dayOfWeek} — {sec.shift}
                        </div>
                        <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                          Phòng {sec.room}
                        </span>
                      </td>

                      <td style={{ padding: '14px', textAlign: 'center', fontSize: '12.5px', fontWeight: 700, color: isFull ? '#ef4444' : '#34d399' }}>
                        {studentCount} / {sec.maxStudents || 50}
                      </td>

                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        {isRegistered ? (
                          <span style={{
                            padding: '6px 12px', borderRadius: '8px',
                            background: 'rgba(16,185,129,0.2)', color: '#34d399',
                            fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}>
                            <i className="fa-solid fa-check"></i> Đã Đăng Ký
                          </span>
                        ) : isFull ? (
                          <span style={{
                            padding: '6px 12px', borderRadius: '8px',
                            background: 'rgba(239,68,68,0.15)', color: '#f87171',
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
                              padding: '7px 16px', borderRadius: '8px', border: 'none',
                              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                              color: '#fff', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(37,99,235,0.3)', transition: 'all 0.2s'
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
          background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', padding: '20px', overflowX: 'auto'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Mã Lớp HP</th>
                <th style={{ padding: '12px 14px' }}>Môn Học</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Số Tín Chỉ</th>
                <th style={{ padding: '12px 14px' }}>Giảng Viên</th>
                <th style={{ padding: '12px 14px' }}>Lịch Học</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hủy Học Phần</th>
              </tr>
            </thead>
            <tbody>
              {mySections.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                    Bạn chưa đăng ký học phần nào trong học kỳ này.
                  </td>
                </tr>
              ) : (
                mySections.map(sec => (
                  <tr key={sec._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '14px', fontFamily: 'monospace', fontWeight: 800, color: '#60a5fa' }}>
                      {sec.sectionCode}
                    </td>

                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{sec.course?.name}</div>
                      <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                        {sec.course?.code}
                      </span>
                    </td>

                    {/* Hiển thị số tín chỉ đồng bộ */}
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px',
                        background: 'rgba(59,130,246,0.2)', color: '#93c5fd',
                        fontWeight: 800, fontSize: '12.5px'
                      }}>
                        {sec.course?.credits || 3} Tín chỉ
                      </span>
                    </td>

                    <td style={{ padding: '14px', color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                      {sec.teacher?.name || 'Giảng viên khoa'}
                    </td>

                    <td style={{ padding: '14px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>
                        Thứ {sec.dayOfWeek === 8 ? 'CN' : sec.dayOfWeek} — {sec.shift}
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                        Phòng {sec.room}
                      </span>
                    </td>

                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDrop(sec)}
                        disabled={submittingId === sec._id}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)',
                          background: 'rgba(239,68,68,0.15)', color: '#f87171',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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
