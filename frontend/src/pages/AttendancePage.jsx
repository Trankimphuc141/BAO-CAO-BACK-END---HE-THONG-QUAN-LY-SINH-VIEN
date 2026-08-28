import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';

export default function AttendancePage({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const qrScannerRef = useRef(null);

  useEffect(() => {
    loadAttendance();
    return () => {
      // Clean up scanner on unmount to prevent camera light leakage
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(console.error);
      }
    };
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
    if (e) e.preventDefault();
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

  const startScanner = async () => {
    setIsScanning(true);
    setCheckInMessage(null);
    
    // Allow DOM to update and render #qr-reader element
    setTimeout(async () => {
      try {
        if (!window.Html5Qrcode) {
          throw new Error("Thư viện quét mã QR chưa được tải.");
        }
        
        const html5QrCode = new window.Html5Qrcode("qr-reader");
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" }, // Camera sau điện thoại / webcam máy tính
          {
            fps: 10,
            qrbox: (width, height) => {
              const minSize = Math.min(width, height);
              const qrboxSize = Math.floor(minSize * 0.7);
              return { width: qrboxSize, height: qrboxSize };
            }
          },
          (decodedText) => {
            // Quét thành công
            setQrTokenInput(decodedText);
            stopScanner();
            handleAutoCheckIn(decodedText);
          },
          () => {
            // Bỏ qua lỗi quét liên tục khi không tìm thấy mã
          }
        );
      } catch (err) {
        console.error("Camera scan start error:", err);
        setCheckInMessage({ 
          type: 'danger', 
          text: '📷 Không thể khởi động máy ảnh. Vui lòng cấp quyền camera cho trình duyệt và tải lại trang.' 
        });
        setIsScanning(false);
      }
    }, 150);
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleAutoCheckIn = async (token) => {
    setCheckingIn(true);
    setCheckInMessage(null);
    try {
      const res = await api.qrCheckIn(token);
      if (res.success) {
        setCheckInMessage({ type: 'success', text: res.message || '🎉 Điểm danh tự động qua QR thành công!' });
        setQrTokenInput('');
        loadAttendance();
      } else {
        setCheckInMessage({ type: 'danger', text: res.message || '❌ Điểm danh tự động thất bại' });
      }
    } catch (err) {
      setCheckInMessage({ type: 'danger', text: 'Có lỗi xảy ra khi tự động gửi yêu cầu' });
    } finally {
      setCheckingIn(false);
    }
  };

  // Calculate overall stats
  const totalPresent = rows.reduce((sum, r) => sum + r.presentCount, 0);
  const totalSessions = rows.reduce((sum, r) => sum + r.totalSessionsDone, 0);
  const averageAttendanceRate = totalSessions > 0 ? ((totalPresent / totalSessions) * 100).toFixed(1) : '100';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* QR Check-In panel */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(0, 82, 156, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)', border: '1px solid rgba(0, 82, 156, 0.2)' }}>
        <div className="panel-header">
          <h3>
            <i className="fa-solid fa-qrcode" style={{ color: 'var(--primary)' }}></i> Sinh viên: Điểm danh bằng Mã QR / Nhập Token
          </h3>
        </div>
        <div style={{ padding: '10px 0' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Sử dụng camera để quét mã QR hoặc nhập thủ công mã Token hiển thị trên màn hình giảng viên để điểm danh.
          </p>

          {/* Camera Scanning Window */}
          {isScanning && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              background: 'var(--bg-dark)', 
              padding: '16px', 
              borderRadius: '12px',
              border: '1px dashed var(--primary)',
              marginBottom: '20px',
              position: 'relative'
            }}>
              <div id="qr-reader" style={{ width: '100%', maxWidth: '350px', borderRadius: '8px', overflow: 'hidden' }}></div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={stopScanner}
                style={{ marginTop: '12px', background: '#dc2626', color: '#fff', border: 'none' }}
              >
                <i className="fa-solid fa-video-slash"></i> Tắt máy ảnh
              </button>
            </div>
          )}

          <form onSubmit={handleQRCheckIn} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={isScanning ? "Đang quét mã QR qua camera..." : "Nhập mã token điểm danh..."}
              className="form-control"
              style={{ flex: 1, minWidth: '250px', background: '#ffffff', border: '1px solid var(--border-color)', color: '#111827' }}
              value={qrTokenInput}
              onChange={(e) => setQrTokenInput(e.target.value)}
              disabled={checkingIn || isScanning}
            />
            
            <button className="btn btn-primary" type="submit" disabled={checkingIn || isScanning || !qrTokenInput.trim()}>
              {checkingIn ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang điểm danh...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-check"></i> Xác nhận mã
                </>
              )}
            </button>

            {!isScanning && (
              <button 
                className="btn btn-secondary" 
                type="button" 
                onClick={startScanner}
                style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
              >
                <i className="fa-solid fa-camera"></i> Quét mã QR
              </button>
            )}
          </form>

          {checkInMessage && (
            <div 
              style={{ 
                marginTop: '14px', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                fontSize: '13px',
                background: checkInMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                border: checkInMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)',
                color: checkInMessage.type === 'success' ? '#059669' : '#dc2626'
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
          <h4 style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '20px', fontWeight: 700 }}>TỶ LỆ CHUYÊN CẦN CHUNG</h4>
          
          <div style={{
            position: 'relative',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: `conic-gradient(#059669 ${averageAttendanceRate}%, rgba(0,0,0,0.06) ${averageAttendanceRate}% 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              width: '116px',
              height: '116px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>{averageAttendanceRate}%</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mặt / Tổng số</span>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '15px', fontSize: '12px' }}>
            <div>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#059669', marginRight: '6px' }}></span>
              Có mặt: {totalPresent}
            </div>
            <div>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', marginRight: '6px' }}></span>
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
                        <span style={{ color: '#059669', fontWeight: 600 }}>{row.presentCount}</span>
                      </td>
                      <td>
                        <span style={{ color: '#d97706' }}>{row.lateCount}</span>
                      </td>
                      <td>{row.excusedCount}</td>
                      <td>
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>{row.unexcusedCount}</span>
                      </td>
                      <td>
                        <strong style={{ color: row.absencePercentage > 20 ? '#dc2626' : 'inherit' }}>{row.absencePercentage}%</strong>
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
