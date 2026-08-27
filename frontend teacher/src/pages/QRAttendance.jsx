import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axiosConfig';
import { io } from 'socket.io-client';
import {
    Box, Typography, Paper, Grid, MenuItem, TextField, Button, Stack,
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
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white', boxShadow: '0 20px 40px rgba(124,58,237,0.3)'
            }}>
                <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
                    <QRIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800}>Điểm danh bằng Mã QR</Typography>
                </Stack>
                <Typography sx={{ opacity: 0.85, fontSize: '0.95rem' }}>
                    Tạo mã QR chiếu lên màn hình. Sinh viên quét mã trên điện thoại của mình để tự động điểm danh trong thời gian thực.
                </Typography>
            </Box>

            {alert && <Alert severity={alert.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

            <Grid container spacing={3}>
                {/* Controls */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight={700} mb={3}>⚙️ Cấu hình lớp học</Typography>
                        <Stack gap={2.5}>
                            <TextField
                                select fullWidth label="Lớp học phần"
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                helperText={currentSection ? `${currentSection.course?.name}` : ''}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                                {classSections.map(s => (
                                    <MenuItem key={s._id} value={s._id}>
                                        {s.sectionCode}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth type="number" label="Buổi số"
                                        value={sessionNumber}
                                        onChange={(e) => setSessionNumber(parseInt(e.target.value) || 1)}
                                        inputProps={{ min: 1, max: 15 }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth type="date" label="Ngày"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                </Grid>
                            </Grid>

                            <TextField
                                select fullWidth label="Thời hạn hiệu lực QR"
                                value={expiresInMinutes}
                                onChange={(e) => setExpiresInMinutes(parseInt(e.target.value))}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                                {[2, 5, 10, 15, 20, 30].map(m => (
                                    <MenuItem key={m} value={m}>{m} phút</MenuItem>
                                ))}
                            </TextField>

                            <Stack gap={1.5}>
                                <Button
                                    fullWidth variant="contained" size="large"
                                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <QRIcon />}
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    sx={{
                                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                        py: 1.5, fontSize: '0.95rem', fontWeight: 700, borderRadius: 2,
                                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                                        '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' }
                                    }}
                                >
                                    {loading ? 'Đang tạo...' : (qrData ? 'Tạo lại QR khác' : 'Bật QR Điểm Danh')}
                                </Button>

                                {qrData && (
                                    <Button
                                        fullWidth variant="outlined" color="error"
                                        startIcon={<StopIcon />}
                                        onClick={handleClose}
                                        sx={{ borderRadius: 2, py: 1.2 }}
                                    >
                                        Chốt & Đóng QR
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                    </Paper>
                </Grid>

                {/* QR Display & Realtime list */}
                <Grid item xs={12} md={8}>
                    <Grid container spacing={3}>
                        {/* QR Image Frame */}
                        <Grid item xs={12} sm={qrData ? 7 : 12}>
                            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider', minHeight: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                {qrData ? (
                                    <Box sx={{ textAlign: 'center', width: '100%' }}>
                                        <Typography variant="subtitle1" fontWeight={750} mb={0.5}>
                                            LỚP: {currentSection?.sectionCode}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" mb={2}>Buổi học số {sessionNumber} • {date}</Typography>

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
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2 }}>
                                        <QRIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
                                        <Typography variant="h6" color="text.secondary" fontWeight={600}>Chưa kích hoạt QR</Typography>
                                        <Typography color="text.secondary" variant="body2" maxWidth={320}>
                                            Chọn lớp học phần và nhấn nút <strong>Bật QR Điểm Danh</strong> ở thanh cấu hình bên trái để tạo mã.
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* Realtime checked-in list */}
                        {qrData && (
                            <Grid item xs={12} sm={5}>
                                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: 440, display: 'flex', flexDirection: 'column' }}>
                                    <Stack direction="row" justifyItems="space-between" alignItems="center" mb={1.5}>
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
                            </Grid>
                        )}
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
}

export default QRAttendance;
