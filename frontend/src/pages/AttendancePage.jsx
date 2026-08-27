import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function AttendancePage({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState(null);

  useEffect(() => {
    loadAttendance();
  }, [currentUser]);

  const loadAttendance = async () => {
    setLoading(true);
    const secRes = await api.getClassSections();
    const loadedRows = [];

    if (secRes.success && secRes.data) {
      for (const section of secRes.data) {
        const repRes = await api.getAttendanceReport(section._id);
        if (repRes.success && repRes.studentStats) {
          const myStat = repRes.studentStats.find(
            (s) => s.student._id?.toString() === (currentUser?.id || '')
          );
          if (myStat) {
            loadedRows.push({
              sectionCode: section.sectionCode,
              courseName: section.course?.name,
              room: section.room || 'Phòng học',
              ...myStat
            });
          }
        }
      }
    }
    setRows(loadedRows);
    setLoading(false);
  };

  const handleQRCheckIn = async (e) => {
    e.preventDefault();
    if (!qrTokenInput.trim()) return;

    setCheckingIn(true);
    setCheckInMessage(null);
    try {
      const res = await api.qrCheckIn(qrTokenInput.trim());
      if (res.success) {
        setCheckInMessage({ type: 'success', text: res.message || '🎉 Điểm danh thành công!' });
        setQrTokenInput('');
        loadAttendance();
      } else {
        setCheckInMessage({ type: 'danger', text: res.message || '❌ Điểm danh thất bại' });
      }
    } catch (err) {
      setCheckInMessage({ type: 'danger', text: 'Có lỗi xảy ra khi gửi yêu cầu' });
    } finally {
      setCheckingIn(false);
    }
  };

  // Calculate overall attendance stats
  const totalPresent = rows.reduce((sum, r) => sum + r.presentCount, 0);
  const totalSessions = rows.reduce((sum, r) => sum + r.totalSessionsDone, 0);
  const averageAttendanceRate = totalSessions > 0 ? ((totalPresent / totalSessions) * 100).toFixed(1) : '100';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* QR Check-In panel */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
        <div className="panel-header">
          <h3>
            <i className="fa-solid fa-qrcode" style={{ color: '#a78bfa' }}></i> Sinh viên: Tự điểm danh bằng QR Code / Token
          </h3>
        </div>
        <div style={{ padding: '10px 0' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Nhập Token hiển thị dưới mã QR của giảng viên trên màn chiếu lớp học để tiến hành tự động điểm danh.
          </p>

          <form onSubmit={handleQRCheckIn} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Nhập mã token điểm danh (VD: 3f8a9...)"
              className="form-control"
              style={{ flex: 1, minWidth: '250px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              value={qrTokenInput}
              onChange={(e) => setQrTokenInput(e.target.value)}
              disabled={checkingIn}
            />
            <button className="btn btn-primary" type="submit" disabled={checkingIn || !qrTokenInput.trim()}>
              {checkingIn ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-check"></i> Xác nhận điểm danh
                </>
              )}
            </button>
          </form>

          {checkInMessage && (
            <div 
              style={{ 
                marginTop: '14px', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                fontSize: '13px',
                background: checkInMessage.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: checkInMessage.type === 'success' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                color: checkInMessage.type === 'success' ? '#34d399' : '#f87171'
              }}
            >
              {checkInMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Summary stats & Detailed Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
        
        {/* Attendance Rate Circle */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '30px 20px' }}>
          <h4 style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '20px' }}>TỶ LỆ CHUYÊN CẦN CHUNG</h4>
          
          <div style={{
            position: 'relative',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: `conic-gradient(#10b981 ${averageAttendanceRate}%, rgba(255,255,255,0.05) ${averageAttendanceRate}% 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{
              width: '116px',
              height: '116px',
              borderRadius: '50%',
              background: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#34d399' }}>{averageAttendanceRate}%</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mặt / Tổng số</span>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '15px', fontSize: '12px' }}>
            <div>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', marginRight: '6px' }}></span>
              Có mặt: {totalPresent}
            </div>
            <div>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', marginRight: '6px' }}></span>
              Tổng buổi: {totalSessions}
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="glass-panel">
          <div className="panel-header">
            <h3>
              <i className="fa-solid fa-clipboard-user"></i> Theo Dõi Chi Tiết Chuyên Cần Lớp Học Phần
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={loadAttendance}>
              <i className="fa-solid fa-rotate"></i> Làm mới
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã LHP</th>
                  <th>Môn Học / Phòng</th>
                  <th>Có Mặt</th>
                  <th>Đi Muộn</th>
                  <th>Vắng C.Phép</th>
                  <th>Vắng K.Phép</th>
                  <th>Tỷ Lệ Vắng (%)</th>
                  <th>Điều Kiện Dự Thi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      {loading ? 'Đang tải dữ liệu chuyên cần...' : 'Chưa có dữ liệu chuyên cần'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <code>{row.sectionCode}</code>
                      </td>
                      <td>
                        <strong>{row.courseName}</strong>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <i className="fa-solid fa-location-dot"></i> {row.room}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>{row.presentCount}</span>
                      </td>
                      <td>
                        <span style={{ color: '#fbbf24' }}>{row.lateCount}</span>
                      </td>
                      <td>{row.excusedCount}</td>
                      <td>
                        <span style={{ color: '#f87171', fontWeight: 600 }}>{row.unexcusedCount}</span>
                      </td>
                      <td>
                        <strong style={{ color: row.absencePercentage > 20 ? '#f87171' : 'inherit' }}>{row.absencePercentage}%</strong>
                      </td>
                      <td>
                        <span className={`badge ${row.isBannedFromExam ? 'badge-danger' : 'badge-success'}`}>
                          {row.isBannedFromExam ? (
                            <>
                              <i className="fa-solid fa-triangle-exclamation"></i> CẤM THI (&gt;20%)
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-circle-check"></i> Đủ điều kiện
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
