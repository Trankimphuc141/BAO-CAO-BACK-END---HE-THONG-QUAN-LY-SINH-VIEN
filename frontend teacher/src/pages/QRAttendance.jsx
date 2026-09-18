import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axiosConfig';
import { io } from 'socket.io-client';
import {
    Box, Typography, Paper, MenuItem, TextField, Button, Stack,
    Chip, Alert, CircularProgress, alpha, Divider, List, ListItem,
    ListItemAvatar, Avatar, ListItemText, Grow
} from '@mui/material';
import {
    QrCode2 as QRIcon,
    Stop as StopIcon,
    Timer as TimerIcon,
    CheckCircle as CheckCircleIcon,
    ArrowCircleRightOutlined as ArrowIcon
} from '@mui/icons-material';

function QRAttendance() {
    const [classSections, setClassSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [sessionNumber, setSessionNumber] = useState(1);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expiresInMinutes, setExpiresInMinutes] = useState(15);
    const [qrData, setQrData] = useState(null); // { qrDataUrl, qrToken, expiresAt, attendance: { _id } }
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [alert, setAlert] = useState(null);
    const [checkedInStudents, setCheckedInStudents] = useState([]);

    const socketRef = useRef(null);

    // Load class sections
    useEffect(() => {
        const fetchSections = async () => {
            try {
                const res = await axios.get('/academic/class-sections');
                if (res.data.success && res.data.data.length > 0) {
                    setClassSections(res.data.data);
                    setSelectedSection(res.data.data[0]._id);
                }
            } catch (err) { console.error(err); }
        };
        fetchSections();
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!qrData) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((new Date(qrData.expiresAt) - new Date()) / 1000));
            setCountdown(remaining);
            if (remaining === 0) {
                setAlert({ type: 'warning', msg: '⏰ Mã QR đã hết hạn. Vui lòng tạo mã mới.' });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [qrData]);

    // Socket.io for Realtime Checkin Updates
    useEffect(() => {
        if (!qrData || !qrData.attendance?._id) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const socketUrl = import.meta.env.VITE_API_URL 
            ? import.meta.env.VITE_API_URL.replace('/api', '') 
            : 'http://localhost:5000';

        console.log('🔌 Teacher connecting to WebSocket at', socketUrl);
        const socket = io(socketUrl);
        socketRef.current = socket;

        const eventName = `qr-checkin-${qrData.attendance._id}`;
        console.log('📡 Listening for checkins on event:', eventName);

        socket.on(eventName, (data) => {
            console.log('⚡ Student checked in realtime:', data);
            setCheckedInStudents(prev => {
                // Avoid duplicates
                if (prev.some(s => s.studentId === data.studentId)) return prev;
                return [data, ...prev];
            });
        });

        return () => {
            if (socket.connected) {
                socket.disconnect();
            }
        };
    }, [qrData]);

    const handleGenerate = async () => {
        if (!selectedSection) { setAlert({ type: 'error', msg: 'Vui lòng chọn lớp học phần.' }); return; }
        setLoading(true);
        setAlert(null);
        setCheckedInStudents([]);
        try {
            const res = await axios.post('/teacher/attendance/generate-qr', {
                classSectionId: selectedSection,
                sessionNumber,
                date,
                expiresInMinutes
            });
            if (res.data.success) {
                setQrData(res.data.data);
                setCountdown(expiresInMinutes * 60);
                setAlert({ type: 'success', msg: `✅ Đã tạo mã QR thành công! Lớp học đang chờ sinh viên quét mã.` });
            }
        } catch (err) {
            setAlert({ type: 'error', msg: err.response?.data?.message || 'Lỗi khi tạo mã QR' });
        } finally { setLoading(false); }
    };

    const handleClose = async () => {
        if (!qrData) return;
        try {
            await axios.post('/teacher/attendance/close-qr', { attendanceId: qrData.attendance._id });
            setQrData(null);
            setCountdown(0);
            setCheckedInStudents([]);
            setAlert({ type: 'info', msg: '🔒 Đã đóng QR điểm danh. Dữ liệu đã lưu thành công.' });
        } catch (err) { console.error(err); }
    };

    const formatCountdown = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const currentSection = classSections.find(s => s._id === selectedSection);
    const isExpired = countdown === 0 && !!qrData;

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                width: '100%',
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                borderRadius: 4,
                p: { xs: 2.5, sm: 3.5 },
                mb: 3.5,
                color: 'white',
                boxShadow: '0 16px 36px rgba(124, 58, 237, 0.25)'
            }}>
                <Stack direction="row" alignItems="center" gap={1.5} mb={0.75}>
                    <QRIcon sx={{ fontSize: { xs: 28, sm: 34 } }} />
                    <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.1rem' }, letterSpacing: '-0.02em' }}>
                        Điểm danh bằng Mã QR
                    </Typography>
                </Stack>
                <Typography sx={{ opacity: 0.9, fontSize: { xs: '0.88rem', sm: '0.98rem' } }}>
                    Tạo mã QR chiếu lên màn hình. Sinh viên quét mã trên điện thoại của mình để tự động điểm danh trong thời gian thực.
                </Typography>
            </Box>

            {alert && <Alert severity={alert.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

            {/* Main Layout Grid */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '380px 1fr' },
                gap: 3,
                width: '100%',
                alignItems: 'start'
            }}>
                {/* Controls */}
                <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>⚙️ Cấu hình lớp học</Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '26px', width: '100%' }}>
                        <TextField
                            select
                            fullWidth
                            label="Lớp học phần"
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            helperText={currentSection ? `${currentSection.course?.name}` : ''}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                        >
                            {classSections.map(s => (
                                <MenuItem key={s._id} value={s._id}>
                                    {s.sectionCode}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '16px', width: '100%' }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Buổi số"
                                value={sessionNumber}
                                onChange={(e) => setSessionNumber(parseInt(e.target.value) || 1)}
                                inputProps={{ min: 1, max: 15 }}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                            <TextField
                                fullWidth
                                type="date"
                                label="Ngày học"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                        </Box>

                        <TextField
                            select
                            fullWidth
                            label="Thời hạn hiệu lực QR"
                            value={expiresInMinutes}
                            onChange={(e) => setExpiresInMinutes(parseInt(e.target.value))}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                        >
                            {[2, 5, 10, 15, 20, 30].map(m => (
                                <MenuItem key={m} value={m}>{m} phút</MenuItem>
                            ))}
                        </TextField>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', pt: 1.5 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <QRIcon />}
                                onClick={handleGenerate}
                                disabled={loading}
                                sx={{
                                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                    py: 1.6,
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    borderRadius: 2.5,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                                    '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' }
                                }}
                            >
                                {loading ? 'Đang tạo...' : (qrData ? 'Tạo lại QR khác' : 'Bật QR Điểm Danh')}
                            </Button>

                            {qrData && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="error"
                                    startIcon={<StopIcon />}
                                    onClick={handleClose}
                                    sx={{ borderRadius: 2.5, py: 1.2, textTransform: 'none', fontWeight: 600 }}
                                >
                                    Chốt & Đóng QR
                                </Button>
                            )}
                        </Box>
                    </Box>
                </Paper>

                {/* QR Display & Realtime list */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: qrData ? { xs: '1fr', md: '1.25fr 0.95fr' } : '1fr',
                    gap: 3,
                    width: '100%',
                    alignItems: 'start'
                }}>
                    {/* QR Image Frame */}
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider', minHeight: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {qrData ? (
                            <Box sx={{ textAlign: 'center', width: '100%' }}>
                                <Typography variant="subtitle1" fontWeight={750} mb={0.5}>
                                    LỚP: {currentSection?.sectionCode}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={2.5}>Buổi học số {sessionNumber} • {date}</Typography>

                                {/* Countdown timer */}
                                <Box sx={{
                                    display: 'inline-flex', alignItems: 'center', gap: 1, px: 2.5, py: 0.8,
                                    borderRadius: 30, mb: 2.5,
                                    bgcolor: isExpired ? alpha('#EF4444', 0.1) : countdown < 60 ? alpha('#EF4444', 0.1) : alpha('#059669', 0.1),
                                    color: isExpired ? '#EF4444' : countdown < 60 ? '#EF4444' : '#059669',
                                    border: '2px solid', borderColor: isExpired ? '#EF4444' : countdown < 60 ? '#EF4444' : '#059669'
                                }}>
                                    <TimerIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="h6" fontWeight={800} fontFamily="monospace" sx={{ fontSize: '1.2rem', lineHeight: 1 }}>
                                        {isExpired ? 'HẾT HẠN' : formatCountdown(countdown)}
                                    </Typography>
                                </Box>

                                {/* QR Code Image */}
                                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                                    <img
                                        src={qrData.qrDataUrl}
                                        alt="QR Code Attendance"
                                        style={{
                                            width: 250, height: 250,
                                            borderRadius: 16,
                                            border: '6px solid',
                                            borderColor: isExpired ? '#EF4444' : '#7c3aed',
                                            filter: isExpired ? 'grayscale(100%) opacity(0.4)' : 'none',
                                            transition: 'all 0.3s ease'
                                        }}
                                    />
                                    {isExpired && (
                                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.65)', borderRadius: 4 }}>
                                            <Typography variant="h6" color="white" fontWeight={800}>⏰ MÃ HẾT HẠN</Typography>
                                        </Box>
                                    )}
                                </Box>

                                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, display: 'inline-block', textAlign: 'left', maxWidth: '100%' }}>
                                    <Typography variant="caption" color="text.secondary" display="block" align="center" fontWeight={600}>Mã token tự nhập (nếu không quét được):</Typography>
                                    <Typography variant="caption" fontFamily="monospace" align="center" sx={{ display: 'block', wordBreak: 'break-all', fontSize: '0.8rem', color: 'primary.main', fontWeight: 700 }}>
                                        {qrData.qrToken}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2, py: 4 }}>
                                <Box sx={{ p: 2.5, bgcolor: alpha('#7c3aed', 0.08), borderRadius: '50%', color: '#7c3aed', mb: 1 }}>
                                    <QRIcon sx={{ fontSize: 64 }} />
                                </Box>
                                <Typography variant="h6" color="text.primary" fontWeight={700}>Chưa kích hoạt QR</Typography>
                                <Typography color="text.secondary" variant="body2" maxWidth={360} sx={{ lineHeight: 1.6 }}>
                                    Chọn lớp học phần và nhấn nút <strong>Bật QR Điểm Danh</strong> ở thanh cấu hình bên trái để tạo mã điểm danh.
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* Realtime checked-in list */}
                    {qrData && (
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: 460, display: 'flex', flexDirection: 'column' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="subtitle1" fontWeight={750} flex={1}>
                                    ⚡ Realtime Check-in
                                </Typography>
                                <Chip
                                    label={`${checkedInStudents.length} SV`}
                                    color="success"
                                    size="small"
                                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                />
                            </Stack>
                            <Divider sx={{ mb: 1.5 }} />

                            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                                {checkedInStudents.length === 0 ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled', textAlign: 'center', px: 2 }}>
                                        <CircularProgress size={24} sx={{ mb: 2, color: 'rgba(0,0,0,0.15)' }} />
                                        <Typography variant="caption" color="text.secondary">
                                            Đang chờ sinh viên đầu tiên check-in...
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List disablePadding>
                                        {checkedInStudents.map((s, idx) => (
                                            <Grow in key={s.studentId} timeout={300}>
                                                <ListItem
                                                    disablePadding
                                                    sx={{
                                                        mb: 1, p: 1, borderRadius: 2,
                                                        border: '1px solid', borderColor: 'divider',
                                                        bgcolor: alpha('#10B981', 0.03),
                                                        '&:hover': { bgcolor: alpha('#10B981', 0.08) }
                                                    }}
                                                >
                                                    <ListItemAvatar sx={{ minWidth: 46 }}>
                                                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main', fontSize: '0.8rem', fontWeight: 700 }}>
                                                            {s.studentName.split(' ').pop().substring(0, 2).toUpperCase()}
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={s.studentName}
                                                        secondary={`${s.studentCode}`}
                                                        primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700, noWrap: true }}
                                                        secondaryTypographyProps={{ fontSize: '0.7rem', fontFamily: 'monospace' }}
                                                    />
                                                    <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                                                </ListItem>
                                            </Grow>
                                        ))}
                                    </List>
                                )}
                            </Box>
                        </Paper>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

export default QRAttendance;
