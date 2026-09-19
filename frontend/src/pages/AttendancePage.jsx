import React, { useEffect, useState, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { api } from '../services/api';

/* ─────────────────────────────────────────────
   Utility: decode QR from an HTMLImageElement
   using Canvas + jsQR (works offline, pure ESM)
───────────────────────────────────────────── */
function decodeQRFromImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'dontInvert',
      });
      URL.revokeObjectURL(img.src);
      if (code) resolve(code.data);
      else reject(new Error('Không tìm thấy mã QR trong ảnh'));
    };
    img.onerror = () => reject(new Error('Không thể tải ảnh'));
    img.src = URL.createObjectURL(file);
  });
}

export default function AttendancePage({ currentUser }) {
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'image' | 'camera'
  const [checkInMessage, setCheckInMessage] = useState(null);

  /* ── manual ── */
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [checkingIn,   setCheckingIn]   = useState(false);

  /* ── image ── */
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanningImg,  setScanningImg]  = useState(false);
  const fileInputRef = useRef(null);

  /* ── camera ── */
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError,  setCameraError]  = useState(null);
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const rafRef       = useRef(null);

  /* cleanup on unmount or tab leave */
  useEffect(() => {
    loadAttendance();
    return () => stopCamera();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab !== 'camera') stopCamera();
  }, [activeTab]);

  /* ──────────────────────────────────────────
     Data loading
  ────────────────────────────────────────── */
  const loadAttendance = async () => {
    setLoading(true);
    const secRes = await api.getClassSections();
    const loaded = [];
    if (secRes.success && secRes.data) {
      for (const section of secRes.data) {
        const r = await api.getAttendanceReport(section._id);
        if (r.success && r.studentStats) {
          const me = r.studentStats.find(
            s => s.student._id?.toString() === (currentUser?.id || '')
          );
          if (me) loaded.push({ sectionCode: section.sectionCode, courseName: section.course?.name, room: section.room || 'Phòng học', ...me });
        }
      }
    }
    setRows(loaded);
    setLoading(false);
  };

  /* ──────────────────────────────────────────
     Core: call backend check-in API
  ────────────────────────────────────────── */
  const doCheckIn = useCallback(async (token) => {
    const raw = token?.toString().trim();
    if (!raw) { setCheckInMessage({ type: 'warning', text: '⚠️ Không có mã token để gửi!' }); return; }
    setCheckingIn(true);
    setCheckInMessage(null);
    try {
      const res = await api.qrCheckIn(raw);
      if (res.success) {
        setCheckInMessage({ type: 'success', text: res.message || '🎉 Điểm danh thành công!' });
        setQrTokenInput('');
        setImageFile(null);
        setImagePreview(null);
        loadAttendance();
      } else {
        setCheckInMessage({ type: 'danger', text: res.message || '❌ Điểm danh thất bại. Mã QR không hợp lệ hoặc đã hết hạn.' });
      }
    } catch {
      setCheckInMessage({ type: 'danger', text: '❌ Lỗi kết nối máy chủ. Vui lòng thử lại.' });
    } finally {
      setCheckingIn(false);
    }
  }, []);

  /* ──────────────────────────────────────────
     TAB 1: Manual submit
  ────────────────────────────────────────── */
  const handleManualSubmit = (e) => {
    e.preventDefault();
    doCheckIn(qrTokenInput);
  };

  /* ──────────────────────────────────────────
     TAB 2: Image upload + Canvas decode
  ────────────────────────────────────────── */
  const handleImageSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setCheckInMessage(null);
    if (e.target) e.target.value = '';
  };

  const handleImageScan = async () => {
    if (!imageFile) return;
    setScanningImg(true);
    setCheckInMessage({ type: 'info', text: '🔍 Đang giải mã mã QR từ ảnh...' });
    try {
      const decoded = await decodeQRFromImage(imageFile);
      setCheckInMessage({ type: 'info', text: `✅ Đọc được mã QR, đang gửi điểm danh...` });
      await doCheckIn(decoded);
    } catch (err) {
      setCheckInMessage({
        type: 'danger',
        text: `❌ ${err.message || 'Không thể đọc mã QR từ ảnh này'}. Hãy dùng ảnh chứa mã QR rõ nét hơn.`,
      });
    } finally {
      setScanningImg(false);
    }
  };

  /* ──────────────────────────────────────────
     TAB 3: Camera via native getUserMedia + jsQR
  ────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const scanFrame = useCallback((video, canvas, ctx, onSuccess) => {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code && code.data) {
        onSuccess(code.data);
        return; // stop loop
      }
    }
    rafRef.current = requestAnimationFrame(() => scanFrame(video, canvas, ctx, onSuccess));
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setCheckInMessage(null);
    setCameraActive(true);

    /* Wait one tick for React to render the video element */
    await new Promise(r => setTimeout(r, 100));

    try {
      if (!videoRef.current) throw new Error('Video element not mounted yet');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx    = canvas.getContext('2d');

      rafRef.current = requestAnimationFrame(() =>
        scanFrame(videoRef.current, canvas, ctx, async (decoded) => {
          stopCamera();
          setCheckInMessage({ type: 'info', text: `🎯 Đã quét được mã QR, đang điểm danh...` });
          await doCheckIn(decoded);
        })
      );
    } catch (err) {
      console.error('Camera error:', err);
      stopCamera();
      let msg = '📷 Không thể mở camera.';
      const e = err?.name || err?.message || '';
      if (e.includes('NotAllowed') || e.includes('Permission') || e.includes('denied')) {
        msg = '🔒 Trình duyệt chặn quyền Camera. Bấm biểu tượng 🔒 trên thanh địa chỉ → chọn "Cho phép" Camera → tải lại trang.';
      } else if (e.includes('NotFound') || e.includes('DevicesNotFound')) {
        msg = '📷 Không tìm thấy thiết bị Camera. Hãy kiểm tra kết nối webcam.';
      } else if (e.includes('NotReadable') || e.includes('TrackStart')) {
        msg = '📷 Camera đang được dùng bởi ứng dụng khác. Hãy đóng chúng và thử lại.';
      } else if (e.includes('NotSupported') || e.includes('OverconstrainedError')) {
        msg = '📷 Camera không hỗ trợ định dạng yêu cầu. Thử dùng cách "Tải Ảnh QR" thay thế.';
      }
      setCameraError(msg);
    }
  };

  /* ──────────────────────────────────────────
     Stats
  ────────────────────────────────────────── */
  const totalPresent  = rows.reduce((s, r) => s + r.presentCount, 0);
  const totalSessions = rows.reduce((s, r) => s + r.totalSessionsDone, 0);
  const avgRate = totalSessions > 0 ? ((totalPresent / totalSessions) * 100).toFixed(1) : '100';

  /* ──────────────────────────────────────────
     Render
  ────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── QR CHECK-IN PANEL ── */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(124,58,237,0.04))',
        border: '1px solid rgba(37,99,235,0.2)'
      }}>
        <div className="panel-header">
          <h3><i className="fa-solid fa-qrcode" style={{ color: 'var(--primary)' }}></i>&nbsp;Điểm Danh bằng Mã QR</h3>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          {[
            { key: 'manual', icon: 'fa-keyboard',    label: 'Nhập Thủ Công' },
            { key: 'image',  icon: 'fa-file-image',  label: 'Tải Ảnh QR' },
            { key: 'camera', icon: 'fa-camera',      label: 'Quét Camera' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 15px', borderRadius: '8px', border: 'none',
              fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.18s ease',
              background: activeTab === t.key ? 'var(--primary)' : '#f1f5f9',
              color:      activeTab === t.key ? '#fff' : 'var(--text-muted)',
              boxShadow:  activeTab === t.key ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
            }}>
              <i className={`fa-solid ${t.icon}`}></i>{t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: MANUAL ── */}
        {activeTab === 'manual' && (
          <div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Nhập hoặc dán mã token do giảng viên cung cấp:
            </p>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Dán mã token QR điểm danh tại đây..."
                className="form-control"
                style={{ flex: 1, minWidth: '240px' }}
                value={qrTokenInput}
                onChange={e => setQrTokenInput(e.target.value)}
                disabled={checkingIn}
                autoFocus
              />
              <button className="btn btn-primary" type="submit" disabled={checkingIn || !qrTokenInput.trim()}>
                {checkingIn
                  ? <><i className="fa-solid fa-spinner fa-spin"></i>&nbsp;Đang xử lý...</>
                  : <><i className="fa-solid fa-circle-check"></i>&nbsp;Xác nhận Điểm Danh</>
                }
              </button>
            </form>
          </div>
        )}

        {/* ── TAB: IMAGE ── */}
        {activeTab === 'image' && (
          <div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Chọn ảnh chứa mã QR (ảnh chụp màn hình, ảnh camera điện thoại…):
            </p>

            {/* Drop zone */}
            <div
              onClick={() => !scanningImg && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${imagePreview ? '#2563eb' : 'var(--border-color)'}`,
                borderRadius: '12px', padding: '24px', textAlign: 'center',
                cursor: scanningImg ? 'not-allowed' : 'pointer',
                background: imagePreview ? 'rgba(37,99,235,0.04)' : '#fafafa',
                transition: 'all 0.2s', marginBottom: '14px',
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handleImageSelect} />

              {imagePreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <img src={imagePreview} alt="QR preview"
                    style={{ maxWidth: '220px', maxHeight: '220px', borderRadius: '8px', border: '2px solid rgba(37,99,235,0.3)', objectFit: 'contain', background: '#fff' }} />
                  <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
                    <i className="fa-solid fa-check-circle"></i>&nbsp;{imageFile?.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bấm để đổi ảnh khác</span>
                </div>
              ) : (
                <>
                  <i className="fa-solid fa-file-image" style={{ fontSize: '38px', color: 'var(--text-muted)', opacity: 0.45, display: 'block', marginBottom: '10px' }}></i>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-sub)' }}>Bấm để chọn ảnh QR</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG, WEBP — ảnh có mã QR rõ nét</div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary"
                onClick={handleImageScan}
                disabled={!imageFile || scanningImg || checkingIn}
                style={{ flex: 1, minWidth: '180px' }}
              >
                {scanningImg
                  ? <><i className="fa-solid fa-spinner fa-spin"></i>&nbsp;Đang giải mã QR...</>
                  : <><i className="fa-solid fa-magnifying-glass"></i>&nbsp;Đọc mã QR từ ảnh</>
                }
              </button>
              {imagePreview && (
                <button className="btn btn-secondary"
                  onClick={() => { setImageFile(null); setImagePreview(null); setCheckInMessage(null); }}
                  disabled={scanningImg}
                >
                  <i className="fa-solid fa-trash"></i>&nbsp;Xóa ảnh
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: CAMERA ── */}
        {activeTab === 'camera' && (
          <div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Hướng camera vào mã QR. Hệ thống tự động nhận diện và điểm danh:
            </p>

            {!cameraActive ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <i className="fa-solid fa-video" style={{ fontSize: '44px', color: 'var(--primary)', opacity: 0.65, display: 'block', marginBottom: '14px' }}></i>
                <button className="btn btn-primary" onClick={startCamera} style={{ fontSize: '13.5px', padding: '10px 28px' }}>
                  <i className="fa-solid fa-play"></i>&nbsp;Bật Camera Quét QR
                </button>
                {cameraError && (
                  <div style={{
                    marginTop: '14px', padding: '13px 16px', borderRadius: '10px',
                    background: '#fef3c7', border: '1px solid #fde68a',
                    color: '#92400e', fontSize: '12.5px', textAlign: 'left', lineHeight: 1.6, fontWeight: 500
                  }}>
                    <i className="fa-solid fa-triangle-exclamation"></i>&nbsp;{cameraError}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                {/* Live viewfinder */}
                <div style={{
                  position: 'relative', width: '100%', maxWidth: '420px',
                  borderRadius: '12px', overflow: 'hidden',
                  border: '2px solid var(--primary)', boxShadow: '0 4px 20px rgba(37,99,235,0.18)',
                  background: '#000',
                }}>
                  <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    style={{ width: '100%', display: 'block', borderRadius: '10px' }}
                  />
                  {/* QR targeting overlay */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: '180px', height: '180px',
                    border: '2px solid rgba(255,255,255,0.7)',
                    borderRadius: '12px',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                    pointerEvents: 'none',
                  }}>
                    {/* corner accents */}
                    {[
                      { top: -2, left: -2, borderRight: 'none', borderBottom: 'none' },
                      { top: -2, right: -2, borderLeft: 'none', borderBottom: 'none' },
                      { bottom: -2, left: -2, borderRight: 'none', borderTop: 'none' },
                      { bottom: -2, right: -2, borderLeft: 'none', borderTop: 'none' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        position: 'absolute', width: '22px', height: '22px',
                        border: '3px solid #60a5fa', borderRadius: '3px', ...s
                      }} />
                    ))}
                  </div>
                </div>
                {/* Hidden canvas for jsQR processing */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '12px', color: '#2563eb', fontWeight: 600,
                  background: '#eff6ff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #bfdbfe'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 1.2s infinite' }}></span>
                  Camera đang hoạt động — hướng mã QR vào khung trắng
                </div>

                <button className="btn btn-secondary" onClick={stopCamera}
                  style={{ background: '#dc2626', color: '#fff', border: 'none' }}>
                  <i className="fa-solid fa-video-slash"></i>&nbsp;Tắt Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* Shared status message */}
        {checkInMessage && (
          <div style={{
            marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
            fontSize: '13px', fontWeight: 600, lineHeight: 1.5,
            background: checkInMessage.type === 'success' ? '#dcfce7' : checkInMessage.type === 'info' ? '#eff6ff' : checkInMessage.type === 'warning' ? '#fef3c7' : '#fee2e2',
            border: `1px solid ${checkInMessage.type === 'success' ? '#bbf7d0' : checkInMessage.type === 'info' ? '#bfdbfe' : checkInMessage.type === 'warning' ? '#fde68a' : '#fecaca'}`,
            color: checkInMessage.type === 'success' ? '#15803d' : checkInMessage.type === 'info' ? '#1d4ed8' : checkInMessage.type === 'warning' ? '#92400e' : '#b91c1c',
          }}>
            {checkInMessage.text}
          </div>
        )}
      </div>

      {/* ── STATS + TABLE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
        {/* Attendance Rate Circle */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '30px 20px' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '20px', fontWeight: 700 }}>TỶ LỆ CHUYÊN CẦN</h4>
          <div style={{
            position: 'relative', width: '140px', height: '140px', borderRadius: '50%',
            background: `conic-gradient(#059669 ${avgRate}%, rgba(0,0,0,0.06) ${avgRate}% 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              width: '116px', height: '116px', borderRadius: '50%', background: 'var(--bg-card)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>{avgRate}%</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mặt / Tổng số</span>
            </div>
          </div>
          <div style={{ marginTop: '24px', display: 'flex', gap: '15px', fontSize: '12px' }}>
            <div><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#059669', marginRight: '6px' }}></span>Có mặt: {totalPresent}</div>
            <div><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', marginRight: '6px' }}></span>Tổng buổi: {totalSessions}</div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="glass-panel">
          <div className="panel-header">
            <h3><i className="fa-solid fa-clipboard-user"></i>&nbsp;Theo Dõi Chi Tiết Chuyên Cần</h3>
            <button className="btn btn-secondary btn-sm" onClick={loadAttendance}>
              <i className="fa-solid fa-rotate"></i>&nbsp;Làm mới
            </button>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã LHP</th><th>Môn Học / Phòng</th><th>Có Mặt</th>
                  <th>Đi Muộn</th><th>Vắng CP</th><th>Vắng KP</th>
                  <th>Tỷ Lệ Vắng</th><th>Điều Kiện Thi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      {loading
                        ? <><i className="fa-solid fa-spinner fa-spin"></i>&nbsp;Đang tải dữ liệu...</>
                        : 'Chưa có dữ liệu chuyên cần'
                      }
                    </td>
                  </tr>
                ) : rows.map((row, i) => (
                  <tr key={i}>
                    <td><code>{row.sectionCode}</code></td>
                    <td>
                      <strong>{row.courseName}</strong>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <i className="fa-solid fa-location-dot"></i>&nbsp;{row.room}
                      </div>
                    </td>
                    <td><span style={{ color: '#059669', fontWeight: 600 }}>{row.presentCount}</span></td>
                    <td><span style={{ color: '#d97706' }}>{row.lateCount}</span></td>
                    <td>{row.excusedCount}</td>
                    <td><span style={{ color: '#dc2626', fontWeight: 600 }}>{row.unexcusedCount}</span></td>
                    <td><strong style={{ color: row.absencePercentage > 20 ? '#dc2626' : 'inherit' }}>{row.absencePercentage}%</strong></td>
                    <td>
                      <span className={`badge ${row.isBannedFromExam ? 'badge-danger' : 'badge-success'}`}>
                        {row.isBannedFromExam
                          ? <><i className="fa-solid fa-triangle-exclamation"></i>&nbsp;CẤM THI (&gt;20%)</>
                          : <><i className="fa-solid fa-circle-check"></i>&nbsp;Đủ điều kiện</>
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
