import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { io } from 'socket.io-client';

export default function TeachingSchedule() {
    const navigate = useNavigate();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Trạng thái phê duyệt / từ chối
    const [pendingRejectSection, setPendingRejectSection] = useState(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [submittingId, setSubmittingId] = useState(null);
    const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
    const socketRef = useRef(null);

    // Đồng hồ thời gian thực
    const [clockText, setClockText] = useState('');
    const [weekOffset, setWeekOffset] = useState(0);
    const [shiftFilter, setShiftFilter] = useState('all'); // 'all', 'sang', 'chieu', 'toi'

    // Đồng hồ chạy thời gian thực
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            const dayName = days[now.getDay()];
            const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            setClockText(`${dayName}, ${dateStr} | ${timeStr}`);
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Tự tắt thông báo toast sau 5 giây
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/academic-mgmt/teacher/my-schedule');
            if (res.data.success) {
                setSections(res.data.data || []);
            }
        } catch {
            setSections([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    // Socket realtime kết nối đồng bộ lịch dạy
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_API_URL 
            ? import.meta.env.VITE_API_URL.replace('/api', '') 
            : 'http://localhost:5000';
        const socket = io(socketUrl);
        socketRef.current = socket;

        socket.on('section-approval-updated', () => {
            fetchSchedule();
        });
        socket.on('timetable-updated', () => {
            fetchSchedule();
        });

        return () => {
            if (socket.connected) {
                socket.disconnect();
            }
        };
    }, [fetchSchedule]);

    // Giảng viên Đồng ý nhận lớp học phần
    const handleAccept = async (sec) => {
        setSubmittingId(sec._id);
        try {
            const res = await axios.put(`/academic-mgmt/sections/${sec._id}/teacher-response`, {
                status: 'accepted'
            });
            if (res.data.success) {
                setToast({
                    type: 'success',
                    message: `✅ Bạn đã đồng ý nhận lớp "${sec.sectionCode}". Lớp học đã được chính thức lên lịch cho sinh viên!`
                });
                fetchSchedule();
            }
        } catch (err) {
            setToast({
                type: 'error',
                message: err.response?.data?.message || 'Có lỗi xảy ra khi xác nhận nhận lớp'
            });
        } finally {
            setSubmittingId(null);
        }
    };

    // Mở modal từ chối / đề xuất đổi lịch
    const handleOpenReject = (sec) => {
        setPendingRejectSection(sec);
        setFeedbackText(sec.teacherFeedback || '');
    };

    // Xác nhận từ chối lớp kèm góp ý đề xuất lịch mới
    const handleSubmitReject = async () => {
        if (!pendingRejectSection) return;
        if (!feedbackText.trim()) {
            alert('Vui lòng nhập lý do từ chối hoặc đề xuất thời gian đổi lịch');
            return;
        }
        setSubmittingId(pendingRejectSection._id);
        try {
            const res = await axios.put(`/academic-mgmt/sections/${pendingRejectSection._id}/teacher-response`, {
                status: 'rejected',
                feedback: feedbackText.trim()
            });
            if (res.data.success) {
                setToast({
                    type: 'success',
                    message: `Bạn đã từ chối lịch lớp "${pendingRejectSection.sectionCode}" và gửi đề xuất thời gian về cho Phòng Đào Tạo.`
                });
                setPendingRejectSection(null);
                fetchSchedule();
            }
        } catch (err) {
            setToast({
                type: 'error',
                message: err.response?.data?.message || 'Có lỗi xảy ra khi gửi phản hồi'
            });
        } finally {
            setSubmittingId(null);
        }
    };

    // Phân loại ca dạy (Sáng, Chiều, Tối)
    const getShiftType = (shift) => {
        if (!shift) return 'sang';
        const s = shift.toLowerCase();
        if (s.includes('ca 1') || s.includes('ca 2') || s.includes('07:') || s.includes('08:') || s.includes('09:') || s.includes('10:') || s.includes('11:')) {
            return 'sang';
        }
        if (s.includes('ca 3') || s.includes('ca 4') || s.includes('12:') || s.includes('13:') || s.includes('14:') || s.includes('15:') || s.includes('16:') || s.includes('17:')) {
            return 'chieu';
        }
        return 'toi';
    };

    // Tính 6 ngày trong tuần (Thứ Hai đến Thứ Bảy) - giống hệt thời khóa biểu của sinh viên
    const getDatesOfWeek = (offset = 0) => {
        const now = new Date();
        const currentDay = now.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday + offset * 7);

        const days = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const isToday = d.toDateString() === now.toDateString();
            days.push({
                dayOfWeekNumber: i + 2, // 2 = Thứ Hai, ..., 7 = Thứ Bảy
                dayName: i === 0 ? 'Thứ Hai' : i === 1 ? 'Thứ Ba' : i === 2 ? 'Thứ Tư' : i === 3 ? 'Thứ Năm' : i === 4 ? 'Thứ Sáu' : 'Thứ Bảy',
                dateStr: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                shortDate: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                isToday
            });
        }
        return days;
    };

    const weekDays = getDatesOfWeek(weekOffset);
    const weekLabel = `${weekOffset === 0 ? 'Tuần này' : weekOffset > 0 ? `+${weekOffset} tuần` : `${weekOffset} tuần`} (${weekDays[0].shortDate} - ${weekDays[5].dateStr})`;

    // Chuyển sang điểm danh lớp học phần này
    const handleGoToAttendance = (secId) => {
        navigate(`/attendance/mark?sectionId=${secId}`);
    };

    // Chuyển sang điểm danh QR
    const handleGoToQR = () => {
        navigate('/attendance/qr');
    };

    // Lọc các lớp đang chờ phê duyệt
    const pendingSections = sections.filter(s => s.teacherApprovalStatus === 'pending');

    return (
        <div className="glass-panel">
            {/* Header */}
            <div className="panel-header">
                <h3>
                    <i className="fa-solid fa-calendar-week" style={{ color: '#2563eb' }}></i>
                    &nbsp;Thời Khóa Biểu Học Tập & Giảng Dạy Theo Thời Gian Thực
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={fetchSchedule}>
                    <i className="fa-solid fa-rotate"></i>&nbsp;Làm mới
                </button>
            </div>

            {/* Thông báo Toast nếu có */}
            {toast && (
                <div style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    color: toast.type === 'success' ? '#065f46' : '#991b1b',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                        <span>{toast.message}</span>
                    </div>
                    <button
                        onClick={() => setToast(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px' }}
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Banner nhắc nhở Phê duyệt lớp mới từ Admin */}
            {pendingSections.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: '#f59e0b', color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0
                        }}>
                            <i className="fa-solid fa-bell fa-shake"></i>
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', color: '#92400e', fontSize: '13.5px' }}>
                                Yêu cầu xác nhận lịch dạy: Có {pendingSections.length} lớp học phần mới do Admin mở phân công
                            </div>
                            <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px', lineHeight: 1.4 }}>
                                Sinh viên chỉ có thể xem thời khóa biểu và đăng ký sau khi bạn bấm <strong>"Đồng ý nhận lớp"</strong>. Nếu bị trùng lịch hoặc muốn đổi ca, vui lòng chọn <strong>"Từ chối / Đổi lịch"</strong>.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Topbar điều hướng & đồng hồ */}
            <div className="timetable-topbar">
                {/* Đồng hồ realtime */}
                <div className="realtime-clock-badge">
                    <i className="fa-solid fa-clock"></i>&nbsp;
                    <span>{clockText || 'Đang tải thời gian...'}</span>
                </div>

                {/* Điều hướng tuần */}
                <div className="week-navigator">
                    <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(prev => prev - 1)}>
                        <i className="fa-solid fa-chevron-left"></i>&nbsp;Tuần Trước
                    </button>
                    <span className="week-display-label">{weekLabel}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(prev => prev + 1)}>
                        Tuần Sau&nbsp;<i className="fa-solid fa-chevron-right"></i>
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setWeekOffset(0)} style={{ marginLeft: '4px' }}>
                        <i className="fa-solid fa-calendar-day"></i>&nbsp;Về Tuần Này
                    </button>
                </div>

                {/* Bộ lọc ca học */}
                <div className="shift-filter-group">
                    <button
                        className={`shift-filter-btn ${shiftFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setShiftFilter('all')}
                    >
                        <i className="fa-solid fa-list-check"></i>&nbsp;Tất cả các ca
                    </button>
                    <button
                        className={`shift-filter-btn ${shiftFilter === 'sang' ? 'active' : ''}`}
                        onClick={() => setShiftFilter('sang')}
                    >
                        <i className="fa-solid fa-sun" style={{ color: '#60a5fa' }}></i>&nbsp;Buổi Sáng (Ca 1, 2)
                    </button>
                    <button
                        className={`shift-filter-btn ${shiftFilter === 'chieu' ? 'active' : ''}`}
                        onClick={() => setShiftFilter('chieu')}
                    >
                        <i className="fa-solid fa-cloud-sun" style={{ color: '#fbbf24' }}></i>&nbsp;Buổi Chiều (Ca 3, 4)
                    </button>
                    <button
                        className={`shift-filter-btn ${shiftFilter === 'toi' ? 'active' : ''}`}
                        onClick={() => setShiftFilter('toi')}
                    >
                        <i className="fa-solid fa-moon" style={{ color: '#c084fc' }}></i>&nbsp;Buổi Tối (Ca 5)
                    </button>
                </div>
            </div>

            {/* Lưới 6 ngày trong tuần (Thứ Hai -> Thứ Bảy) */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb' }}></i>
                    <div style={{ marginTop: '12px', fontSize: '13px' }}>Đang tải thời khóa biểu...</div>
                </div>
            ) : (
                <div className="schedule-grid">
                    {weekDays.map((day) => {
                        let dayItems = sections.filter(item => item.dayOfWeek === day.dayOfWeekNumber);

                        if (shiftFilter !== 'all') {
                            dayItems = dayItems.filter(item => getShiftType(item.shift) === shiftFilter);
                        }

                        return (
                            <div key={day.dayOfWeekNumber} className={`schedule-day-column ${day.isToday ? 'is-today' : ''}`}>
                                {/* Header của ngày */}
                                <div className="schedule-day-header">
                                    <div className="schedule-day-name">{day.dayName}</div>
                                    <div className="schedule-day-date">{day.dateStr}</div>
                                </div>

                                {/* Nội dung các ca học */}
                                {dayItems.length === 0 ? (
                                    <div style={{ fontSize: '11.5px', color: '#94a3b8', textAlign: 'center', marginTop: '40px' }}>
                                        <i
                                            className="fa-regular fa-calendar-xmark"
                                            style={{ fontSize: '22px', marginBottom: '6px', display: 'block', opacity: 0.35 }}
                                        ></i>
                                        Không có ca học
                                    </div>
                                ) : (
                                    dayItems.map((s) => {
                                        const sType = getShiftType(s.shift);
                                        const sessionClass = sType === 'sang'
                                            ? 'session-sang'
                                            : sType === 'chieu'
                                            ? 'session-chieu'
                                            : 'session-toi';

                                        const badgeClass = sType === 'sang'
                                            ? 'shift-sang'
                                            : sType === 'chieu'
                                            ? 'shift-chieu'
                                            : 'shift-toi';

                                        const sessionName = sType === 'sang'
                                            ? '🌅 Sáng'
                                            : sType === 'chieu'
                                            ? '☀️ Chiều'
                                            : '🌙 Tối';

                                        const isPending = s.teacherApprovalStatus === 'pending';
                                        const isRejected = s.teacherApprovalStatus === 'rejected';
                                        const isAccepted = s.teacherApprovalStatus === 'accepted' || (!isPending && !isRejected);

                                        return (
                                            <div
                                                key={s._id}
                                                className={`schedule-card ${sessionClass}`}
                                                style={{
                                                    border: isPending ? '1.5px dashed #f59e0b' : isRejected ? '1.5px dashed #ef4444' : undefined,
                                                    background: isPending ? 'linear-gradient(to bottom, #ffffff, #fffdfa)' : undefined
                                                }}
                                            >
                                                {/* Dòng ca học và trạng thái phê duyệt */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span className={`schedule-shift-badge ${badgeClass}`}>
                                                        {sessionName} • {s.shift || 'Ca học'}
                                                    </span>

                                                    {isPending && (
                                                        <span style={{
                                                            background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a',
                                                            padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                                                            display: 'inline-flex', alignItems: 'center', gap: '3px'
                                                        }}>
                                                            <i className="fa-solid fa-clock"></i> Chờ bạn duyệt
                                                        </span>
                                                    )}

                                                    {isAccepted && (
                                                        <span style={{
                                                            background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                                                            padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                                                            display: 'inline-flex', alignItems: 'center', gap: '3px'
                                                        }}>
                                                            <i className="fa-solid fa-check"></i> Đã lên lịch SV
                                                        </span>
                                                    )}

                                                    {isRejected && (
                                                        <span style={{
                                                            background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                                                            padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                                                            display: 'inline-flex', alignItems: 'center', gap: '3px'
                                                        }}>
                                                            <i className="fa-solid fa-ban"></i> Đã từ chối
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="schedule-course-title">
                                                    {s.course?.name || 'Môn học'}
                                                </div>

                                                <div className="schedule-meta-item">
                                                    <i className="fa-solid fa-layer-group"></i>&nbsp;Mã HP:{' '}
                                                    <strong style={{ color: '#2563eb' }}>{s.sectionCode || s.course?.code}</strong>
                                                </div>

                                                <div className="schedule-meta-item">
                                                    <i className="fa-solid fa-location-dot"></i>&nbsp;Phòng:&nbsp;
                                                    <strong>{s.room}</strong>
                                                </div>

                                                <div className="schedule-meta-item">
                                                    <i className="fa-solid fa-users"></i>&nbsp;Sĩ số:&nbsp;
                                                    <strong>{s.students?.length || 0} / {s.maxStudents || 50}</strong>
                                                </div>

                                                <div className="schedule-meta-item" style={{ color: '#059669', fontSize: '10.5px' }}>
                                                    <i className="fa-solid fa-circle-check"></i>&nbsp;Tiết {s.startPeriod || 1} - {s.endPeriod || 3} ({s.course?.credits || 3} TC)
                                                </div>

                                                {/* Nếu đang chờ duyệt: Hiển thị cảnh báo & 2 nút Đồng ý / Từ chối */}
                                                {isPending && (
                                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #fcd34d' }}>
                                                        <div style={{
                                                            fontSize: '11px', color: '#92400e', background: '#fffbeb',
                                                            padding: '6px 8px', borderRadius: '6px', border: '1px solid #fef3c7',
                                                            marginBottom: '8px', lineHeight: 1.35
                                                        }}>
                                                            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }}></i>&nbsp;
                                                            <strong>Chưa lên TKB sinh viên:</strong> Bấm Đồng ý để kích hoạt thời khóa biểu.
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button
                                                                className="btn btn-success btn-sm"
                                                                style={{ flex: 1, padding: '5px 8px', fontSize: '11px', justifyContent: 'center' }}
                                                                disabled={submittingId === s._id}
                                                                onClick={() => handleAccept(s)}
                                                                title="Đồng ý nhận lịch dạy lớp này"
                                                            >
                                                                {submittingId === s._id ? (
                                                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                                                ) : (
                                                                    <><i className="fa-solid fa-check"></i>&nbsp;Đồng ý</>
                                                                )}
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                style={{ flex: 1, padding: '5px 8px', fontSize: '11px', justifyContent: 'center' }}
                                                                disabled={submittingId === s._id}
                                                                onClick={() => handleOpenReject(s)}
                                                                title="Từ chối nhận lớp hoặc đề xuất đổi lịch khác"
                                                            >
                                                                <i className="fa-solid fa-xmark"></i>&nbsp;Đổi lịch
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Nếu đã từ chối: Hiển thị lý do và nút đổi ý */}
                                                {isRejected && (
                                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #fca5a5' }}>
                                                        <div style={{
                                                            fontSize: '11px', color: '#991b1b', background: '#fef2f2',
                                                            padding: '6px 8px', borderRadius: '6px', border: '1px solid #fee2e2',
                                                            marginBottom: '8px', lineHeight: 1.35
                                                        }}>
                                                            <strong>Đề xuất đổi lịch:</strong> {s.teacherFeedback || 'Không có ghi chú'}
                                                        </div>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ width: '100%', padding: '5px 8px', fontSize: '11px', justifyContent: 'center' }}
                                                            disabled={submittingId === s._id}
                                                            onClick={() => handleAccept(s)}
                                                        >
                                                            {submittingId === s._id ? (
                                                                <i className="fa-solid fa-spinner fa-spin"></i>
                                                            ) : (
                                                                <><i className="fa-solid fa-rotate-left"></i>&nbsp;Đổi ý: Đồng ý nhận lớp</>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Nếu đã chấp thuận: Hiển thị nút điểm danh và QR */}
                                                {isAccepted && (
                                                    <div style={{
                                                        display: 'flex', gap: '6px', marginTop: '8px', paddingTop: '7px',
                                                        borderTop: '1px dashed rgba(0,0,0,0.08)'
                                                    }}>
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', justifyContent: 'center' }}
                                                            onClick={() => handleGoToAttendance(s._id)}
                                                        >
                                                            <i className="fa-solid fa-clipboard-user"></i>&nbsp;Điểm danh
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ padding: '4px 8px', fontSize: '11px' }}
                                                            title="Chiếu mã QR điểm danh"
                                                            onClick={handleGoToQR}
                                                        >
                                                            <i className="fa-solid fa-qrcode"></i>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Từ Chối Hoặc Đề Xuất Đổi Lịch Dạy */}
            {pendingRejectSection && (
                <div className="modal-overlay" onClick={() => setPendingRejectSection(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-triangle-exclamation"></i>
                                Từ Chối & Đề Xuất Lịch Dạy Mới
                            </h4>
                            <button
                                onClick={() => setPendingRejectSection(null)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '13px' }}>
                                <div><strong>Lớp học phần:</strong> <span style={{ color: '#2563eb', fontWeight: 700 }}>{pendingRejectSection.sectionCode}</span></div>
                                <div style={{ marginTop: '4px' }}><strong>Môn học:</strong> {pendingRejectSection.course?.name} ({pendingRejectSection.course?.code})</div>
                                <div style={{ marginTop: '4px' }}>
                                    <strong>Lịch dự kiến:</strong> Thứ {pendingRejectSection.dayOfWeek === 8 ? 'CN' : pendingRejectSection.dayOfWeek} — {pendingRejectSection.shift} (Phòng {pendingRejectSection.room})
                                </div>
                            </div>

                            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#334155' }}>
                                Lý do từ chối & Thời gian bạn muốn đề xuất đổi sang: <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <textarea
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px',
                                    lineHeight: 1.5,
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="Ví dụ: Tôi bị trùng lịch nghiên cứu sáng Thứ 2. Xin đề xuất chuyển sang chiều Thứ 4 (Ca 3) phòng A102..."
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                autoFocus
                            />
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '8px', lineHeight: 1.4 }}>
                                <i className="fa-solid fa-circle-info" style={{ color: '#2563eb' }}></i>&nbsp;
                                Ý kiến phản hồi sẽ được gửi trực tiếp đến Ban Quản Lý/Admin để sắp xếp lại thời khóa biểu phù hợp.
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setPendingRejectSection(null)}
                                disabled={submittingId === pendingRejectSection._id}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={handleSubmitReject}
                                disabled={submittingId === pendingRejectSection._id}
                            >
                                {submittingId === pendingRejectSection._id ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i>&nbsp;Đang gửi...</>
                                ) : (
                                    <><i className="fa-solid fa-paper-plane"></i>&nbsp;Gửi Phản Hồi Từ Chối</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
