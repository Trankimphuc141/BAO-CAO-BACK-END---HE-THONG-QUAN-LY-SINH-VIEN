import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Paper, Grid, MenuItem, TextField, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
    Stack, Alert, Snackbar, Tooltip, IconButton, alpha, Dialog, DialogTitle,
    DialogContent, DialogActions, LinearProgress, Badge, CircularProgress, Fade, Avatar
} from '@mui/material';
import {
    Lock as LockIcon, LockOpen as UnlockIcon, Publish as PublishIcon,
    School as SchoolIcon, Edit as EditIcon, Save as SaveIcon,
    Analytics as AnalyticsIcon, EmojiEvents as TrophyIcon,
    CheckCircle, Cancel, Sync as SyncIcon, Send as SendIcon,
    HistoryEdu as AppealIcon, HourglassEmpty as HourglassIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

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

function GradeManagement() {
    const navigate = useNavigate();
    const location = useLocation();
    const [classSections, setClassSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [grades, setGrades] = useState([]);
    const [appeals, setAppeals] = useState([]);
    const [appealsFilterTab, setAppealsFilterTab] = useState('all'); // 'all' | 'current'
    const [appealSearch, setAppealSearch] = useState('');
    const [stats, setStats] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [showDailyAttendance, setShowDailyAttendance] = useState(true);
    const [loading, setLoading] = useState(false);
    const [editRow, setEditRow] = useState(null); // { gradeId, attendanceScore, midtermScore, finalScore, teacherComment }
    const [snack, setSnack] = useState(null);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Appeals dialogs
    const [openAppealsDialog, setOpenAppealsDialog] = useState(false);
    const [unlockReasonDialog, setUnlockReasonDialog] = useState(null);
    const [unlockReasonText, setUnlockReasonText] = useState('');
    const [rejectAppealDialog, setRejectAppealDialog] = useState(null);
    const [rejectFeedbackText, setRejectFeedbackText] = useState('');
    const [replyDialog, setReplyDialog] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [forwardToAdminDialog, setForwardToAdminDialog] = useState(null);
    const [forwardToAdminText, setForwardToAdminText] = useState('');
    // Chat thread
    const [chatDialog, setChatDialog] = useState(null); // appeal object
    const [chatText, setChatText] = useState('');
    const [chatSending, setChatSending] = useState(false);

    const fetchAppeals = useCallback(async () => {
        try {
            const res = await axios.get('/teacher/appeals');
            if (res.data && res.data.success && Array.isArray(res.data.data)) {
                setAppeals(res.data.data);
                setChatDialog(prev => {
                    if (!prev) return null;
                    return res.data.data.find(a => a && a._id === prev._id) || prev;
                });
            } else {
                setAppeals([]);
            }
        } catch (err) {
            console.error('Lỗi fetchAppeals:', err);
            setAppeals([]);
        }
    }, []);

    const fetchClassSections = useCallback(async () => {
        try {
            const res = await axios.get('/academic/class-sections');
            if (res.data && res.data.success && Array.isArray(res.data.data)) {
                setClassSections(res.data.data);
                if (res.data.data.length > 0) {
                    setSelectedSection(prev => prev || res.data.data[0]._id);
                }
            } else {
                setClassSections([]);
            }
        } catch (err) {
            console.error(err);
            setClassSections([]);
        }
    }, []);

    const fetchGrades = useCallback(async () => {
        if (!selectedSection) return;
        setLoading(true);
        try {
            const res = await axios.get(`/teacher/class-grades/${selectedSection}`);
            if (res.data && res.data.success && Array.isArray(res.data.data)) {
                setGrades(res.data.data);
                setStats(res.data.stats || null);
                if (Array.isArray(res.data.attendance)) setAttendance(res.data.attendance);
            } else {
                setGrades([]);
                setStats(null);
            }
        } catch (err) {
            console.error(err);
            setGrades([]);
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [selectedSection]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('view') === 'appeals') {
            setOpenAppealsDialog(true);
        }
        const secParam = params.get('section');
        if (secParam) {
            setSelectedSection(secParam);
        }
    }, [location.search]);

    useEffect(() => { 
        fetchClassSections(); 
        fetchAppeals();
    }, [fetchClassSections, fetchAppeals]);

    useEffect(() => { 
        if (selectedSection) {
            fetchGrades(); 
            fetchAppeals();
        }
    }, [selectedSection, fetchGrades, fetchAppeals]);

    useEffect(() => {
        const handleFocus = () => {
            if (selectedSection) {
                fetchGrades();
                fetchAppeals();
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [selectedSection, fetchGrades, fetchAppeals]);

    // Lắng nghe WebSocket realtime để đồng bộ dữ liệu ngay lập tức không cần F5
    useEffect(() => {
        const socketUrl = window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:5000' : 'http://localhost:5000';
        const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

        const handleRealtimeSync = () => {
            fetchClassSections();
            fetchAppeals();
            if (selectedSection) {
                fetchGrades();
            }
        };

        socket.on('grade-updated', handleRealtimeSync);
        socket.on('grades-submitted', handleRealtimeSync);
        socket.on('grades-published', handleRealtimeSync);
        socket.on('appeal-updated', handleRealtimeSync);
        socket.on('new-appeal', handleRealtimeSync);
        socket.on('attendance-updated', handleRealtimeSync);
        socket.on('attendance-synced', handleRealtimeSync);

        return () => {
            socket.off('grade-updated', handleRealtimeSync);
            socket.off('grades-submitted', handleRealtimeSync);
            socket.off('grades-published', handleRealtimeSync);
            socket.off('appeal-updated', handleRealtimeSync);
            socket.off('new-appeal', handleRealtimeSync);
            socket.off('attendance-updated', handleRealtimeSync);
            socket.off('attendance-synced', handleRealtimeSync);
            socket.disconnect();
        };
    }, [selectedSection, fetchClassSections, fetchAppeals, fetchGrades]);

    // Đồng bộ điểm chuyên cần từ 15 buổi điểm danh sang bảng điểm
    const handleSyncAttendance = async () => {
        if (!selectedSection) {
            setSnack({ severity: 'warning', msg: 'Vui lòng chọn lớp học phần cần đồng bộ.' });
            return;
        }
        try {
            setSyncing(true);
            const res = await axios.post('/academic/attendance/sync', { classSectionId: selectedSection });
            if (res.data.success) {
                setSnack({ severity: 'success', msg: res.data.message || 'Đồng bộ điểm chuyên cần thành công!' });
                fetchGrades();
            }
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi đồng bộ điểm chuyên cần.' });
        } finally {
            setSyncing(false);
        }
    };

    // Helper tính điểm / trạng thái từng buổi học cho sinh viên
    const getStudentSessionAttendance = (studentId, grade, sessionNum) => {
        if (!grade) {
            return { score: 10, label: '100%', tooltip: `Buổi ${sessionNum}: 100%`, status: 'good' };
        }
        if (Array.isArray(grade.sessionScores) && grade.sessionScores.length >= sessionNum) {
            const val = Number(grade.sessionScores[sessionNum - 1]);
            if (!isNaN(val)) {
                const isGood = val >= 8;
                const isWarn = val >= 5;
                const pct = val === 10 ? '100%' : val === 5 ? '50%' : '0%';
                return {
                    score: val,
                    label: pct,
                    tooltip: `Buổi ${sessionNum}: ${isGood ? 'Có mặt' : isWarn ? 'Đi muộn' : 'Vắng'} (${pct})`,
                    status: isGood ? 'good' : isWarn ? 'warning' : 'danger'
                };
            }
        }
        const safeAttendance = Array.isArray(attendance) ? attendance : [];
        const attDoc = safeAttendance.find(a => a && Number(a.sessionNumber) === sessionNum);
        if (attDoc && Array.isArray(attDoc.records)) {
            const rec = attDoc.records.find(r => r && String(r.student?._id || r.student) === String(studentId));
            if (rec) {
                if (rec.status === 'present') return { score: 10, label: '100%', tooltip: `Buổi ${sessionNum}: Có mặt (100%)`, status: 'good' };
                if (rec.status === 'late') return { score: 5, label: '50%', tooltip: `Buổi ${sessionNum}: Đi muộn (50%)`, status: 'warning' };
                if (rec.status === 'excused_absent') return { score: 0, label: '0%', tooltip: `Buổi ${sessionNum}: Vắng có phép (0%, -6.67%)`, status: 'danger' };
                if (rec.status === 'unexcused_absent') return { score: 0, label: '0%', tooltip: `Buổi ${sessionNum}: Vắng không phép (0%, -6.67%)`, status: 'danger' };
            }
        }
        const def = grade.attendanceScore !== undefined ? grade.attendanceScore : 10;
        const pct = def === 10 ? '100%' : def === 5 ? '50%' : def === 0 ? '0%' : `${(def * 10).toFixed(0)}%`;
        return {
            score: def,
            label: pct,
            tooltip: `Buổi ${sessionNum}: ${pct}`,
            status: def >= 8 ? 'good' : def >= 5 ? 'warning' : 'danger'
        };
    };

    const handleEditStart = (g) => setEditRow({
        gradeId: g._id, attendanceScore: g.attendanceScore,
        midtermScore: g.midtermScore, finalScore: g.finalScore, teacherComment: g.teacherComment || ''
    });

    const handleEditSave = async () => {
        if (!editRow) return;
        setSaving(true);
        try {
            await axios.put(`/teacher/grades/${editRow.gradeId}`, editRow);
            setEditRow(null);
            fetchGrades();
            setSnack({ severity: 'success', msg: '✅ Đã lưu điểm thành công!' });
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi lưu điểm' });
        } finally { setSaving(false); }
    };

    const handleSubmitToAdmin = async () => {
        setSaving(true);
        try {
            const res = await axios.post('/teacher/grades/submit-to-admin', { classSectionId: selectedSection });
            fetchGrades();
            setSnack({ severity: 'success', msg: `✅ ${res.data.message}` });
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi gửi bảng điểm cho Admin' });
        } finally { setSaving(false); }
    };

    const handleReSubmitToAdmin = async () => {
        setSaving(true);
        try {
            const res = await axios.post('/teacher/grades/re-submit', { classSectionId: selectedSection });
            fetchGrades();
            fetchAppeals();
            setSnack({ severity: 'success', msg: `✅ ${res.data.message}` });
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi gửi lại bảng điểm cho Admin' });
        } finally { setSaving(false); }
    };

    const handleRequestUnlockSubmit = async () => {
        if (!unlockReasonDialog) return;
        setSaving(true);
        try {
            const res = await axios.post('/teacher/grades/request-unlock', {
                classSectionId: selectedSection,
                appealId: unlockReasonDialog._id,
                reason: unlockReasonText
            });
            setUnlockReasonDialog(null);
            setUnlockReasonText('');
            fetchGrades();
            fetchAppeals();
            setSnack({ severity: 'success', msg: `✅ ${res.data.message}` });
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi gửi yêu cầu mở khóa' });
        } finally { setSaving(false); }
    };

    const handleRejectAppealSubmit = async () => {
        if (!rejectAppealDialog) return;
        setSaving(true);
        try {
            const res = await axios.post(`/teacher/appeals/${rejectAppealDialog._id}/respond`, {
                action: 'reject',
                feedback: rejectFeedbackText
            });
            setRejectAppealDialog(null);
            setRejectFeedbackText('');
            fetchAppeals();
            setSnack({ severity: 'info', msg: `✅ ${res.data.message}` });
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi phản hồi đơn' });
        } finally { setSaving(false); }
    };

    const handleReplySubmit = async () => {
        if (!replyDialog) return;
        setSaving(true);
        try {
            const res = await axios.post(`/teacher/appeals/${replyDialog._id}/respond`, {
                action: 'reply',
                feedback: replyText
            });
            setReplyDialog(null);
            setReplyText('');
            fetchAppeals();
            setSnack({ severity: 'success', msg: `✅ ${res.data.message}` });
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi gửi câu trả lời cho sinh viên' });
        } finally { setSaving(false); }
    };

    const handleSendChat = async () => {
        if (!chatDialog || !chatText.trim()) return;
        setChatSending(true);
        try {
            const res = await axios.post(`/teacher/appeals/${chatDialog._id}/message`, { content: chatText });
            if (res.data.success) {
                setChatDialog(res.data.data); // cập nhật thread mới
                setChatText('');
                fetchAppeals();
            }
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi gửi tin nhắn' });
        } finally { setChatSending(false); }
    };

    const handleForwardToAdminSubmit = async () => {
        if (!forwardToAdminDialog) return;
        setSaving(true);
        try {
            const res = await axios.post(`/teacher/appeals/${forwardToAdminDialog._id}/respond`, {
                action: 'forward_to_admin',
                feedback: forwardToAdminText
            });
            setForwardToAdminDialog(null);
            setForwardToAdminText('');
            fetchAppeals();
            setSnack({ severity: 'success', msg: `✅ ${res.data.message}` });
        } catch (err) {
            setSnack({ severity: 'error', msg: err.response?.data?.message || 'Lỗi khi gửi ý kiến lên Admin' });
        } finally { setSaving(false); }
    };

    // Preview score for edit row
    const previewScore = editRow
        ? +(editRow.attendanceScore * 0.1 + editRow.midtermScore * 0.3 + editRow.finalScore * 0.6).toFixed(2)
        : null;

    const safeSections = Array.isArray(classSections) ? classSections : [];
    const safeAppeals = Array.isArray(appeals) ? appeals : [];
    const safeGrades = Array.isArray(grades) ? grades : [];

    const currentSection = safeSections.find(s => s && s._id === selectedSection);
    const sectionAppeals = safeAppeals.filter(a => a && String(a.classSection?._id || a.classSection) === String(selectedSection));
    const totalPendingAppeals = safeAppeals.filter(a => a && ['pending_teacher', 'teacher_request_unlock', 'admin_unlocked', 'teacher_re_submitted'].includes(a.status));
    const pendingSectionAppeals = sectionAppeals.filter(a => a && ['pending_teacher', 'teacher_request_unlock', 'admin_unlocked', 'teacher_re_submitted'].includes(a.status));

    const displayedAppeals = (appealsFilterTab === 'current' ? sectionAppeals : safeAppeals).filter(a => {
        if (!a) return false;
        if (!appealSearch || !appealSearch.trim()) return true;
        const q = appealSearch.trim().toLowerCase();
        const name = String(a.student?.name || '').toLowerCase();
        const code = String(a.student?.code || '').toLowerCase();
        const course = String(a.course?.name || '').toLowerCase();
        const section = String(a.classSection?.sectionCode || '').toLowerCase();
        return name.includes(q) || code.includes(q) || course.includes(q) || section.includes(q);
    });

    const isSubmitted = safeGrades.length > 0 && safeGrades.some(g => g && g.submissionStatus === 'submitted');
    const isPublished = safeGrades.length > 0 && safeGrades.every(g => g && g.isPublished);
    const isReSubmitted = safeGrades.length > 0 && safeGrades.some(g => g && g.submissionStatus === 're_submitted');
    const isUnlockRequested = safeGrades.length > 0 && safeGrades.some(g => g && g.unlockStatus === 'requested_unlock');
    const isUnlockedForEdit = safeGrades.length > 0 && safeGrades.some(g => g && g.unlockStatus === 'unlocked_for_edit');

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 60%, #4f46e5 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white', boxShadow: '0 20px 40px rgba(79,70,229,0.3)'
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={3}>
                    <Box>
                        <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
                            <SchoolIcon sx={{ fontSize: 32 }} />
                            <Typography variant="h4" fontWeight={800}>Quản lý Điểm số</Typography>
                        </Stack>
                        <Typography sx={{ opacity: 0.8 }}>Nhập điểm, gửi Admin kiểm tra & công bố, xử lý phúc khảo sinh viên</Typography>
                    </Box>
                    <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
                        <Button
                            variant="outlined"
                            startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                            onClick={handleSyncAttendance}
                            disabled={syncing || !selectedSection}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.4)', color: 'white',
                                fontWeight: 700,
                                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.15)' }
                            }}
                        >
                            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ từ Điểm danh'}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<AnalyticsIcon />}
                            onClick={() => navigate(`/analytics/${selectedSection}`)}
                            sx={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                        >
                            Xem thống kê
                        </Button>

                        {/* Nút xem Đơn Phúc Khảo */}
                        <Badge badgeContent={totalPendingAppeals.length} color="error">
                            <Button
                                variant="outlined"
                                startIcon={<AppealIcon />}
                                onClick={() => setOpenAppealsDialog(true)}
                                sx={{
                                    borderColor: totalPendingAppeals.length > 0 ? '#fde68a' : 'rgba(255,255,255,0.4)',
                                    color: 'white',
                                    bgcolor: totalPendingAppeals.length > 0 ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                                    fontWeight: 700,
                                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.15)' }
                                }}
                            >
                                Đơn Phúc Khảo ({safeAppeals.length > 0 ? (sectionAppeals.length > 0 ? `${sectionAppeals.length} lớp này / ${safeAppeals.length} tổng` : `${safeAppeals.length} đơn`) : 0})
                            </Button>
                        </Badge>

                        {/* Hành động gửi/công bố theo quy trình nghiệp vụ */}
                        {isUnlockedForEdit ? (
                            <Button
                                variant="contained"
                                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                                onClick={handleReSubmitToAdmin}
                                disabled={saving || safeGrades.length === 0}
                                sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, fontWeight: 700 }}
                            >
                                Chốt Điểm Phúc Khảo & Gửi Admin
                            </Button>
                        ) : isReSubmitted ? (
                            <Chip
                                icon={<HourglassIcon sx={{ fontSize: '15px !important', color: '#fff !important' }} />}
                                label="Đã nộp lại sau phúc khảo - Chờ Admin công bố"
                                sx={{ bgcolor: '#8b5cf6', color: 'white', fontWeight: 700, px: 1 }}
                            />
                        ) : isUnlockRequested ? (
                            <Chip
                                icon={<HourglassIcon sx={{ fontSize: '15px !important', color: '#fff !important' }} />}
                                label="Đang chờ Admin duyệt mở bảng điểm"
                                sx={{ bgcolor: '#d97706', color: 'white', fontWeight: 700, px: 1 }}
                            />
                        ) : isPublished ? (
                            <Chip
                                icon={<CheckCircle sx={{ fontSize: '15px !important', color: '#fff !important' }} />}
                                label="Admin đã công bố điểm chính thức"
                                sx={{ bgcolor: '#10B981', color: 'white', fontWeight: 700, px: 1 }}
                            />
                        ) : isSubmitted ? (
                            <Chip
                                icon={<LockIcon sx={{ fontSize: '15px !important', color: '#fff !important' }} />}
                                label="🔒 Đã khóa nhập điểm & Chờ Admin duyệt"
                                sx={{ bgcolor: '#2563eb', color: 'white', fontWeight: 700, px: 1.5, py: 0.5 }}
                            />
                        ) : (
                            <Button
                                variant="contained"
                                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
                                onClick={handleSubmitToAdmin}
                                disabled={saving || safeGrades.length === 0}
                                sx={{ bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' }, fontWeight: 700 }}
                            >
                                🔒 Khóa Nhập Điểm & Nộp Admin
                            </Button>
                        )}
                    </Stack>
                </Stack>

                {/* Stats */}
                {stats && (
                    <Stack direction="row" gap={2} mt={3} flexWrap="wrap">
                        {[
                            { label: 'Tổng SV', value: stats.total, icon: '👥' },
                            { label: 'Đạt', value: stats.passed, icon: '✅' },
                            { label: 'Rớt', value: stats.failed, icon: '❌' },
                            { label: 'Đã công bố', value: stats.published, icon: '📢' },
                            { label: 'Đã khóa', value: stats.locked, icon: '🔒' },
                            { label: 'Điểm TB', value: stats.avgScore, icon: '📊' },
                        ].map(s => (
                            <Box key={s.label} sx={{ bgcolor: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(10px)', borderRadius: 2, px: 2.5, py: 1.5, border: '1px solid rgba(255,255,255,0.2)' }}>
                                <Typography variant="h5" fontWeight={800}>{s.icon} {s.value}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.75 }}>{s.label}</Typography>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Box>

            {/* Class selector */}
            <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField
                            select fullWidth label="Chọn lớp học phần"
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                            {classSections.map(sec => (
                                <MenuItem key={sec._id} value={sec._id}>
                                    <Box>
                                        <Typography fontWeight={600}>{sec.sectionCode}</Typography>
                                        <Typography variant="caption" color="text.secondary">{sec.course?.name} — {sec.students?.length || 0} SV</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    {currentSection && (
                        <Grid item xs={12} sm={6}>
                            <Stack direction="row" gap={2} flexWrap="wrap">
                                <Chip label={`Môn: ${currentSection.course?.name}`} variant="outlined" color="primary" />
                                <Chip label={`${currentSection.course?.credits} tín chỉ`} variant="outlined" />
                                <Chip label={`Phòng: ${currentSection.room}`} variant="outlined" />
                            </Stack>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            {/* Workflow Alerts */}
            {!isUnlockedForEdit && !isUnlockRequested && !isReSubmitted && !isSubmitted && !isPublished && safeGrades.length > 0 && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2, bgcolor: alpha('#10B981', 0.08), borderColor: '#a7f3d0' }}>
                    ✍️ <strong>Lớp học phần đang mở nhập điểm:</strong> Quý Thầy/Cô có thể bấm vào biểu tượng ✏️ ở cột thao tác của từng sinh viên để nhập điểm Chuyên cần, Giữa kỳ, Cuối kỳ và nhận xét. Sau khi hoàn tất, hãy bấm <strong>"🔒 Khóa Nhập Điểm & Nộp Admin"</strong> để khóa bảng điểm và gửi cho Admin kiểm tra.
                </Alert>
            )}
            {isSubmitted && !isPublished && !isUnlockedForEdit && !isUnlockRequested && !isReSubmitted && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                    🔒 <strong>Bảng điểm đã được khóa và nộp cho Admin kiểm tra:</strong> Không thể chỉnh sửa điểm. Khi sinh viên nộp đơn phúc khảo và Quý Thầy/Cô chuyển đơn lên Admin, Admin phê duyệt mở khóa thì hệ thống mới cho phép sửa điểm.
                </Alert>
            )}
            {isUnlockedForEdit && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>
                    🔓 <strong>Bảng điểm đã được Admin MỞ KHÓA!</strong> Giảng viên có thể nhấn vào biểu tượng ✏️ ở cột thao tác của từng sinh viên để cập nhật điểm mới theo kết quả phúc khảo. Sau khi hoàn tất, hãy nhấn nút <strong>"Chốt Điểm Phúc Khảo & Gửi Admin"</strong> ở góc trên bên phải để Admin kiểm tra và công bố chính thức.
                </Alert>
            )}
            {isUnlockRequested && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                    ⏳ <strong>Đã gửi yêu cầu xin mở khóa bảng điểm tới Admin!</strong> Vui lòng chờ Ban Đào tạo / Khảo thí phê duyệt để mở quyền chấm và sửa điểm bài phúc khảo.
                </Alert>
            )}
            {isReSubmitted && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.1), color: '#6d28d9', borderColor: '#c4b5fd' }}>
                    📢 <strong>Đã gửi lại bảng điểm sau phúc khảo cho Admin!</strong> Admin đang kiểm tra lần cuối trước khi chốt và công bố điểm chính thức mới tới sinh viên.
                </Alert>
            )}

            {/* Toolbar & Header Bảng Điểm */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Danh Sách Điểm Sinh Viên ({grades.length} sinh viên)
                </Typography>
                <Button
                    size="small"
                    variant={showDailyAttendance ? 'contained' : 'outlined'}
                    onClick={() => setShowDailyAttendance(prev => !prev)}
                    sx={{
                        textTransform: 'none', borderRadius: 2, fontSize: '0.78rem', fontWeight: 600,
                        background: showDailyAttendance ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : undefined
                    }}
                >
                    <i className="fa-solid fa-calendar-days" style={{ marginRight: 6 }}></i>
                    {showDailyAttendance ? 'Đang hiện 15 buổi điểm danh' : 'Bật xem 15 buổi điểm danh'}
                </Button>
            </Box>

            {/* Grade Table */}
            {loading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
            ) : (
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: showDailyAttendance ? 1380 : 900 }}>
                            <TableHead>
                                {showDailyAttendance ? (
                                    <>
                                        <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.05) }}>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>Mã SV</TableCell>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 140 }}>Họ tên</TableCell>
                                            
                                            {/* Header 15 Buổi Điểm Danh Hằng Ngày */}
                                            <TableCell colSpan={16} align="center" sx={{
                                                fontWeight: 800, fontSize: '0.73rem', textTransform: 'uppercase',
                                                color: '#1d4ed8', bgcolor: alpha('#2563eb', 0.08),
                                                borderLeft: '1px solid rgba(37,99,235,0.2)',
                                                borderRight: '1px solid rgba(37,99,235,0.2)',
                                                py: 1
                                            }}>
                                                📅 Điểm Chuyên Cần 15 Buổi Điểm Danh Hằng Ngày (10%)
                                            </TableCell>
                                            
                                            <TableCell rowSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 90 }}>Giữa kỳ (30%)</TableCell>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 90 }}>Cuối kỳ (60%)</TableCell>
                                            <TableCell rowSpan={2} align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>Điểm TK</TableCell>
                                            <TableCell rowSpan={2} align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>Xếp loại</TableCell>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 140 }}>Nhận xét</TableCell>
                                            <TableCell rowSpan={2} align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5 }}>TT</TableCell>
                                            <TableCell rowSpan={2} align="center" sx={{ py: 1.5, width: 80 }}>Thao tác</TableCell>
                                        </TableRow>
                                        <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.02) }}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(sessionNum => (
                                                <TableCell key={sessionNum} align="center" sx={{
                                                    fontWeight: 700, fontSize: '0.68rem', color: '#2563eb',
                                                    px: 0.4, py: 0.8, minWidth: 32,
                                                    bgcolor: alpha('#2563eb', 0.03),
                                                    borderLeft: sessionNum === 1 ? '1px solid rgba(37,99,235,0.2)' : undefined
                                                }}>
                                                    B{sessionNum}
                                                </TableCell>
                                            ))}
                                            <TableCell align="center" sx={{
                                                fontWeight: 800, fontSize: '0.7rem', color: '#059669',
                                                px: 0.8, py: 0.8, minWidth: 70,
                                                bgcolor: alpha('#059669', 0.06),
                                                borderRight: '1px solid rgba(37,99,235,0.2)',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                Tổng CC
                                            </TableCell>
                                        </TableRow>
                                    </>
                                ) : (
                                    <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.05) }}>
                                        {['Mã SV', 'Họ tên', 'Chuyên cần (10%)', 'Giữa kỳ (30%)', 'Cuối kỳ (60%)', 'Điểm TK', 'Xếp loại', 'Nhận xét', 'TT', 'Thao tác'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                )}
                            </TableHead>
                            <TableBody>
                                {safeGrades.map((g) => {
                                    if (!g) return null;
                                    const isEditing = editRow?.gradeId === g._id;
                                    const lc = (g.letterGrade && LETTER_COLORS[g.letterGrade]) || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
                                    const studentAppeal = safeAppeals.find(a => 
                                        a &&
                                        String(a.student?._id || a.student) === String(g.student?._id || g.student) &&
                                        String(a.classSection?._id || a.classSection) === String(selectedSection)
                                    );
                                    return (
                                        <Fade in key={g._id} timeout={200}>
                                            <TableRow hover sx={{ bgcolor: isEditing ? alpha('#4F46E5', 0.04) : 'transparent', '&:hover': { bgcolor: alpha('#4F46E5', 0.03) } }}>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4F46E5', fontSize: '0.8rem' }}>{g.student?.code}</TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', minWidth: 140 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                                        <span>{g.student?.name}</span>
                                                        {studentAppeal && (
                                                            <Tooltip title={`Đơn phúc khảo ${studentAppeal.scoreType === 'midterm' ? 'giữa kỳ' : studentAppeal.scoreType === 'final' ? 'cuối kỳ' : 'chuyên cần'}: "${studentAppeal.reason?.substring(0, 45)}..." — Bấm để xem xét & trả lời`}>
                                                                <Chip
                                                                    size="small"
                                                                    label={
                                                                        studentAppeal.status === 'pending_teacher' ? '📝 Đơn phúc khảo' :
                                                                        studentAppeal.status === 'teacher_replied' ? '💬 Đã trả lời' :
                                                                        studentAppeal.status === 'teacher_request_unlock' ? '📤 Đã gửi Admin' :
                                                                        studentAppeal.status === 'admin_unlocked' ? '🔓 Admin đã mở' :
                                                                        studentAppeal.status === 'teacher_rejected' ? '❌ Đã từ chối' : '📝 Đơn phúc khảo'
                                                                    }
                                                                    color={
                                                                        studentAppeal.status === 'pending_teacher' ? 'warning' :
                                                                        studentAppeal.status === 'teacher_replied' ? 'info' :
                                                                        studentAppeal.status === 'admin_unlocked' ? 'success' :
                                                                        studentAppeal.status === 'teacher_rejected' ? 'error' : 'secondary'
                                                                    }
                                                                    onClick={() => {
                                                                        setChatDialog(studentAppeal);
                                                                        setChatText('');
                                                                    }}
                                                                    sx={{
                                                                        height: 22,
                                                                        fontSize: '0.66rem',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        boxShadow: studentAppeal.status === 'pending_teacher' ? '0 0 8px rgba(245, 158, 11, 0.45)' : 'none'
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>

                                                {/* 15 Buổi Điểm Danh Hằng Ngày */}
                                                {showDailyAttendance && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(sessionNum => {
                                                    const info = getStudentSessionAttendance(g.student?._id || g.student, g, sessionNum);
                                                    const isGood = info.status === 'good';
                                                    const isWarn = info.status === 'warning';
                                                    const bgColor = isGood ? '#ecfdf5' : isWarn ? '#fffbeb' : '#fef2f2';
                                                    const textColor = isGood ? '#059669' : isWarn ? '#d97706' : '#dc2626';
                                                    const borderColor = isGood ? '#a7f3d0' : isWarn ? '#fde68a' : '#fecaca';

                                                    return (
                                                        <TableCell key={sessionNum} align="center" sx={{
                                                            px: 0.3, py: 1,
                                                            borderLeft: sessionNum === 1 ? '1px solid rgba(37,99,235,0.1)' : undefined
                                                        }}>
                                                            <Tooltip title={info.tooltip} arrow>
                                                                <Box sx={{
                                                                    minWidth: 32, height: 22, px: 0.3, borderRadius: '4px',
                                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: '0.62rem', fontWeight: 800,
                                                                    bgcolor: bgColor, color: textColor,
                                                                    border: '1px solid', borderColor: borderColor,
                                                                    cursor: 'default'
                                                                }}>
                                                                    {info.label}
                                                                </Box>
                                                            </Tooltip>
                                                        </TableCell>
                                                    );
                                                })}

                                                {/* Điểm Chuyên cần (10%) */}
                                                <TableCell sx={{ borderRight: showDailyAttendance ? '1px solid rgba(37,99,235,0.1)' : undefined }}>
                                                    {isEditing ? (
                                                        <TextField
                                                            type="number" size="small" variant="outlined"
                                                            inputProps={{ min: 0, max: 10, step: 0.1, style: { textAlign: 'center', padding: '4px 8px' } }}
                                                            sx={{ width: 75 }}
                                                            value={editRow.attendanceScore}
                                                            onChange={(e) => setEditRow({ ...editRow, attendanceScore: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    ) : (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography fontWeight={700} fontSize="0.9rem" sx={{ color: g.attendanceScore >= 8 ? '#059669' : g.attendanceScore >= 5 ? '#d97706' : '#dc2626' }}>
                                                                {g.attendanceScore}
                                                            </Typography>
                                                            {!showDailyAttendance && (
                                                                <LinearProgress variant="determinate" value={g.attendanceScore * 10}
                                                                    sx={{ flex: 1, height: 4, borderRadius: 2, minWidth: 40,
                                                                        bgcolor: alpha('#4F46E5', 0.1),
                                                                        '& .MuiLinearProgress-bar': { bgcolor: g.attendanceScore >= 5 ? '#10B981' : '#EF4444', borderRadius: 2 } }} />
                                                            )}
                                                        </Box>
                                                    )}
                                                </TableCell>

                                                {/* Điểm Giữa kỳ & Cuối kỳ */}
                                                {['midtermScore', 'finalScore'].map(field => (
                                                    <TableCell key={field}>
                                                        {isEditing ? (
                                                            <TextField
                                                                type="number" size="small" variant="outlined"
                                                                inputProps={{ min: 0, max: 10, step: 0.1, style: { textAlign: 'center', padding: '4px 8px' } }}
                                                                sx={{ width: 75 }}
                                                                value={editRow[field]}
                                                                onChange={(e) => setEditRow({ ...editRow, [field]: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        ) : (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography fontWeight={700} fontSize="0.9rem">{g[field]}</Typography>
                                                                <LinearProgress variant="determinate" value={g[field] * 10}
                                                                    sx={{ flex: 1, height: 4, borderRadius: 2, minWidth: 35,
                                                                        bgcolor: alpha('#4F46E5', 0.1),
                                                                        '& .MuiLinearProgress-bar': { bgcolor: g[field] >= 5 ? '#10B981' : '#EF4444', borderRadius: 2 } }} />
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                ))}

                                                <TableCell>
                                                    <Typography fontWeight={800} fontSize="1rem"
                                                        sx={{ color: isEditing ? (previewScore >= 5 ? '#059669' : '#DC2626') : (g.isPassed ? '#059669' : '#DC2626') }}>
                                                        {isEditing ? previewScore : g.totalScore10}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell>
                                                    <Box sx={{ display: 'inline-block', px: 1.5, py: 0.4, borderRadius: 2, fontWeight: 800, fontSize: '0.8rem', bgcolor: lc.bg, color: lc.color, border: '1px solid', borderColor: lc.border || 'transparent' }}>
                                                        {g.letterGrade}
                                                    </Box>
                                                </TableCell>

                                                <TableCell sx={{ minWidth: 160 }}>
                                                    {isEditing ? (
                                                        <TextField
                                                            size="small" variant="standard" placeholder="Nhận xét..."
                                                            value={editRow.teacherComment}
                                                            onChange={(e) => setEditRow({ ...editRow, teacherComment: e.target.value })}
                                                            sx={{ width: '100%' }}
                                                        />
                                                    ) : (
                                                        <Typography fontSize="0.8rem" color="text.secondary" fontStyle={g.teacherComment ? 'italic' : 'normal'}>
                                                            {g.teacherComment || '—'}
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Stack direction="row" gap={0.5}>
                                                        {g.isLocked && <Tooltip title="Đã khóa"><LockIcon sx={{ fontSize: 16, color: '#EF4444' }} /></Tooltip>}
                                                        {g.isPublished && !g.isLocked && <Tooltip title="Đã công bố"><PublishIcon sx={{ fontSize: 16, color: '#10B981' }} /></Tooltip>}
                                                        {!g.isPublished && !g.isLocked && <Tooltip title="Chưa công bố"><UnlockIcon sx={{ fontSize: 16, color: '#6B7280' }} /></Tooltip>}
                                                    </Stack>
                                                </TableCell>

                                                <TableCell align="center">
                                                    {isEditing ? (
                                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                                            <Tooltip title="Lưu điểm">
                                                                <IconButton color="primary" size="small" onClick={handleEditSave} disabled={saving}>
                                                                    <SaveIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Hủy">
                                                                <IconButton color="inherit" size="small" onClick={() => setEditRow(null)}>
                                                                    <Cancel fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Stack>
                                                    ) : isUnlockedForEdit ? (
                                                        <Tooltip title="Bảng điểm đã được Admin mở khóa: Bấm để sửa điểm phúc khảo cho sinh viên này">
                                                            <IconButton
                                                                color="warning"
                                                                size="small"
                                                                onClick={() => handleEditStart(g)}
                                                                sx={{ bgcolor: alpha('#f59e0b', 0.15), '&:hover': { bgcolor: alpha('#f59e0b', 0.3) } }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    ) : (!g.isLocked && !isSubmitted && !isPublished && !isReSubmitted && !isUnlockRequested) ? (
                                                        <Tooltip title="Lớp đang mở: Bấm để nhập / chỉnh sửa điểm số cho sinh viên này">
                                                            <IconButton
                                                                color="primary"
                                                                size="small"
                                                                onClick={() => handleEditStart(g)}
                                                                sx={{ bgcolor: alpha('#4f46e5', 0.1), '&:hover': { bgcolor: alpha('#4f46e5', 0.2) } }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title={
                                                            isPublished ? "Bảng điểm đã được công bố chính thức. Khi sinh viên phúc khảo và Admin duyệt mở khóa mới có thể sửa." :
                                                            isUnlockRequested ? "Bảng điểm đang chờ Admin duyệt mở khóa." :
                                                            "Bảng điểm đã bị khóa và nộp Admin. Không thể chỉnh sửa."
                                                        }>
                                                            <Typography fontSize="0.75rem" color="error.main" fontWeight={700} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                                <LockIcon sx={{ fontSize: 13 }} /> Đã khóa
                                                            </Typography>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </Fade>
                                    );
                                })}
                                {safeGrades.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={showDailyAttendance ? 24 : 10} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                                            <SchoolIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                                            <Typography>Chưa có dữ liệu điểm cho lớp này. Hãy vào trang Sinh viên → Chi tiết để nhập điểm.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Dialog Xem danh sách Phúc khảo */}
            <Dialog open={openAppealsDialog} onClose={() => setOpenAppealsDialog(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AppealIcon sx={{ color: '#4f46e5', fontSize: 28 }} />
                        <Box>
                            <Typography variant="h6" fontWeight={800} color="#1e1b4b">
                                Danh Sách Đơn Phúc Khảo Điểm Số
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Xem xét đơn phúc khảo từ sinh viên, trao đổi trực tiếp hoặc gửi ý kiến đề xuất lên Admin
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        label={`${totalPendingAppeals.length} đơn cần xử lý`}
                        color={totalPendingAppeals.length > 0 ? 'warning' : 'default'}
                        sx={{ fontWeight: 700 }}
                    />
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {/* Bộ lọc Tab và Ô tìm kiếm */}
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ mb: 2.5, pb: 1.5, borderBottom: '1px solid #e2e8f0' }} gap={1.5}>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant={appealsFilterTab === 'all' ? 'contained' : 'outlined'}
                                onClick={() => setAppealsFilterTab('all')}
                                sx={{
                                    fontWeight: 700, borderRadius: 2, textTransform: 'none',
                                    bgcolor: appealsFilterTab === 'all' ? '#4f46e5' : 'transparent',
                                    color: appealsFilterTab === 'all' ? '#fff' : '#4f46e5'
                                }}
                            >
                                Tất cả đơn ({safeAppeals.length})
                            </Button>
                            <Button
                                size="small"
                                variant={appealsFilterTab === 'current' ? 'contained' : 'outlined'}
                                onClick={() => setAppealsFilterTab('current')}
                                sx={{
                                    fontWeight: 700, borderRadius: 2, textTransform: 'none',
                                    bgcolor: appealsFilterTab === 'current' ? '#4f46e5' : 'transparent',
                                    color: appealsFilterTab === 'current' ? '#fff' : '#4f46e5'
                                }}
                            >
                                Lớp hiện tại: {currentSection?.sectionCode || 'Chưa chọn'} ({sectionAppeals.length})
                            </Button>
                        </Stack>
                        <TextField
                            size="small"
                            placeholder="Tìm tên SV, MSSV, môn học..."
                            value={appealSearch}
                            onChange={(e) => setAppealSearch(e.target.value)}
                            sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    </Stack>

                    {appealsFilterTab === 'current' && sectionAppeals.length === 0 && safeAppeals.length > 0 && (
                        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                            Lớp học phần <strong>{currentSection?.sectionCode}</strong> hiện tại chưa có đơn phúc khảo nào.
                            Tuy nhiên Thầy/Cô có <strong>{safeAppeals.length} đơn phúc khảo</strong> ở các lớp khác.
                            <Button
                                size="small"
                                onClick={() => setAppealsFilterTab('all')}
                                sx={{ fontWeight: 700, ml: 1, textTransform: 'none' }}
                            >
                                👉 Bấm để xem tất cả đơn
                            </Button>
                        </Alert>
                    )}

                    {displayedAppeals.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                            <AppealIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                            <Typography fontWeight={600}>Không có đơn phúc khảo nào phù hợp.</Typography>
                            <Typography variant="caption">Khi sinh viên nộp đơn phúc khảo điểm, thông tin người gửi và nội dung sẽ hiển thị tại đây.</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Người gửi (Sinh viên)</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Học phần / Lớp</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Mục điểm</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Điểm số</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Lý do & Ghi chú</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Hội thoại</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedAppeals.map(appeal => {
                                        const isCurrent = String(appeal.classSection?._id || appeal.classSection) === String(selectedSection);
                                        return (
                                            <TableRow key={appeal._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                                {/* Người gửi (Sinh viên) */}
                                                <TableCell sx={{ minWidth: 180 }}>
                                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                                        <Avatar
                                                            src={appeal.student?.avatar}
                                                            alt={appeal.student?.name}
                                                            sx={{ width: 34, height: 34, bgcolor: '#6366f1', fontSize: '0.85rem', fontWeight: 700 }}
                                                        >
                                                            {String(appeal.student?.name || 'S').charAt(0).toUpperCase()}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography fontWeight={700} fontSize="0.88rem" color="#1e293b">
                                                                {appeal.student?.name || 'Chưa cập nhật tên'}
                                                            </Typography>
                                                            <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
                                                                <Chip
                                                                    size="small"
                                                                    label={appeal.student?.code || 'MSSV'}
                                                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#f1f5f9' }}
                                                                />
                                                                {appeal.student?.classCode && (
                                                                    <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                                                                        {appeal.student.classCode}
                                                                    </Typography>
                                                                )}
                                                            </Stack>
                                                            {appeal.student?.email && (
                                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                                                    {appeal.student.email}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Stack>
                                                </TableCell>

                                                {/* Học phần & Lớp */}
                                                <TableCell sx={{ minWidth: 150 }}>
                                                    <Typography fontWeight={700} fontSize="0.84rem" color="#334155">
                                                        {appeal.course?.name || 'Môn học'}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.8} alignItems="center" mt={0.3}>
                                                        <Chip
                                                            size="small"
                                                            label={`Lớp: ${appeal.classSection?.sectionCode || '—'}`}
                                                            color="primary"
                                                            variant="outlined"
                                                            sx={{ height: 19, fontSize: '0.68rem', fontWeight: 600 }}
                                                        />
                                                        {!isCurrent && (
                                                            <Tooltip title="Chuyển sang bảng điểm lớp học phần này">
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setSelectedSection(appeal.classSection?._id || appeal.classSection);
                                                                        setOpenAppealsDialog(false);
                                                                    }}
                                                                    sx={{ fontSize: '0.68rem', p: '1px 6px', minWidth: 'unset', textTransform: 'none', fontWeight: 600 }}
                                                                >
                                                                    👉 Mở lớp
                                                                </Button>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>

                                                {/* Mục điểm */}
                                                <TableCell sx={{ minWidth: 100 }}>
                                                    <Chip
                                                        size="small"
                                                        label={appeal.scoreType === 'midterm' ? 'Giữa kỳ (30%)' : appeal.scoreType === 'final' ? 'Cuối kỳ (60%)' : 'Chuyên cần (10%)'}
                                                        color={appeal.scoreType === 'final' ? 'primary' : appeal.scoreType === 'midterm' ? 'secondary' : 'default'}
                                                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                                                    />
                                                </TableCell>

                                                {/* Điểm số */}
                                                <TableCell align="center" sx={{ minWidth: 110 }}>
                                                    <Box>
                                                        <Typography fontWeight={800} fontSize="0.95rem" color="error.main">
                                                            {appeal.oldScore} đ
                                                        </Typography>
                                                        {appeal.proposedScore !== null && appeal.proposedScore !== undefined ? (
                                                            <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, display: 'block' }}>
                                                                ➜ SV muốn: {appeal.proposedScore} đ
                                                            </Typography>
                                                        ) : (
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                                (Điểm ban đầu)
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>

                                                {/* Lý do & Ghi chú */}
                                                <TableCell sx={{ maxWidth: 220, minWidth: 160 }}>
                                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', color: '#1e293b' }}>
                                                        {appeal.reason}
                                                    </Typography>
                                                    {appeal.studentNote && (
                                                        <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontStyle: 'italic', mt: 0.5 }}>
                                                            Ghi chú: {appeal.studentNote}
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                {/* Trạng thái */}
                                                <TableCell align="center" sx={{ minWidth: 140 }}>
                                                    {appeal.status === 'pending_teacher' && (
                                                        <Chip size="small" label="⏳ Chờ GV xem xét" color="warning" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                                    )}
                                                    {appeal.status === 'teacher_replied' && (
                                                        <Chip size="small" label="💬 GV đã trao đổi" sx={{ bgcolor: '#0284c7', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} />
                                                    )}
                                                    {appeal.status === 'teacher_request_unlock' && (
                                                        <Chip size="small" label="📤 Đã gửi Admin duyệt" sx={{ bgcolor: '#d97706', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} />
                                                    )}
                                                    {appeal.status === 'admin_unlocked' && (
                                                        <Chip size="small" label="🔓 Admin đã mở khóa" color="info" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                                    )}
                                                    {appeal.status === 'teacher_re_submitted' && (
                                                        <Chip size="small" label="⏳ Đã nộp - Chờ duyệt" sx={{ bgcolor: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} />
                                                    )}
                                                    {appeal.status === 'admin_approved_published' && (
                                                        <Chip size="small" label="✅ Đã chốt điểm mới" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                                    )}
                                                    {appeal.status === 'teacher_rejected' && (
                                                        <Chip size="small" label="❌ GV từ chối - Giữ điểm" color="error" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                                    )}
                                                </TableCell>

                                                {/* Thao tác */}
                                                <TableCell align="center" sx={{ minWidth: 150 }}>
                                                    {['pending_teacher', 'teacher_replied'].includes(appeal.status) && (
                                                        <Stack direction="column" spacing={0.6} alignItems="center">
                                                            <Stack direction="row" spacing={0.6}>
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', bgcolor: '#4f46e5', p: '2px 8px' }}
                                                                    onClick={() => {
                                                                        setChatDialog(appeal);
                                                                        setChatText('');
                                                                    }}
                                                                >
                                                                    💬 Trả lời SV
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="error"
                                                                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.7rem', p: '2px 6px' }}
                                                                    onClick={() => {
                                                                        setRejectAppealDialog(appeal);
                                                                        setRejectFeedbackText('');
                                                                    }}
                                                                >
                                                                    ❌ Giữ điểm
                                                                </Button>
                                                            </Stack>
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' }, width: '100%', p: '2px 6px' }}
                                                                onClick={() => {
                                                                    setForwardToAdminDialog(appeal);
                                                                    setForwardToAdminText(`Giảng viên đã xem xét đơn phúc khảo ${appeal.scoreType === 'midterm' ? 'giữa kỳ' : appeal.scoreType === 'final' ? 'cuối kỳ' : 'chuyên cần'} của SV ${appeal.student?.name} (${appeal.student?.code}). Đề xuất Admin mở khóa bảng điểm để giảng viên kiểm tra & chấm lại bài thi.`);
                                                                }}
                                                            >
                                                                📤 Gửi Admin Xin Mở Khóa
                                                            </Button>
                                                        </Stack>
                                                    )}
                                                    {appeal.status === 'teacher_rejected' && (
                                                        <Stack direction="column" spacing={0.6} alignItems="center">
                                                            <Typography variant="caption" color="error.main" fontWeight={700}>Đã từ chối</Typography>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.68rem', color: '#d97706', borderColor: '#d97706', p: '1px 6px' }}
                                                                onClick={() => {
                                                                    setForwardToAdminDialog(appeal);
                                                                    setForwardToAdminText(appeal.teacherFeedback || '');
                                                                }}
                                                            >
                                                                📤 Vẫn gửi Admin xem
                                                            </Button>
                                                        </Stack>
                                                    )}
                                                    {appeal.status === 'admin_unlocked' && (
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            onClick={() => {
                                                                setSelectedSection(appeal.classSection?._id || appeal.classSection);
                                                                setOpenAppealsDialog(false);
                                                            }}
                                                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem' }}
                                                        >
                                                            👉 Nhập điểm lại ngay
                                                        </Button>
                                                    )}
                                                    {appeal.status === 'teacher_request_unlock' && (
                                                        <Typography variant="caption" color="#d97706" fontWeight={700}>
                                                            ⏳ Chờ Admin xem xét
                                                        </Typography>
                                                    )}
                                                    {['teacher_re_submitted', 'admin_approved_published'].includes(appeal.status) && (
                                                        <Typography variant="caption" color="text.secondary">✓ Hoàn tất</Typography>
                                                    )}
                                                </TableCell>

                                                {/* Nút Hội Thoại */}
                                                <TableCell align="center" sx={{ width: 90 }}>
                                                    <Tooltip title="Xem chi tiết & gửi tin nhắn trao đổi với sinh viên">
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => {
                                                                setChatDialog(appeal);
                                                                setChatText('');
                                                            }}
                                                            sx={{
                                                                textTransform: 'none', fontSize: '0.72rem', fontWeight: 700,
                                                                borderColor: '#6366f1', color: '#4f46e5',
                                                                '&:hover': { bgcolor: '#eef2ff', borderColor: '#4f46e5' },
                                                                minWidth: 'unset', px: 1
                                                            }}
                                                        >
                                                            💬 {appeal.messages?.length > 0 ? `Chat (${appeal.messages.length})` : 'Chat'}
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenAppealsDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Nhập Lý Do Xin Admin Mở Khóa */}
            <Dialog open={!!unlockReasonDialog} onClose={() => setUnlockReasonDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Gửi yêu cầu Admin mở khóa bảng điểm</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Để chỉnh sửa điểm sau khi rà soát phúc khảo, vui lòng nhập lý do để gửi đề xuất mở khóa bảng điểm tới Admin (Ban Đào tạo/Khảo thí).
                    </Typography>
                    <TextField
                        autoFocus
                        multiline
                        rows={3}
                        fullWidth
                        label="Lý do xin mở khóa bảng điểm"
                        value={unlockReasonText}
                        onChange={(e) => setUnlockReasonText(e.target.value)}
                        placeholder="Ví dụ: Giảng viên đã chấm lại bài thi cuối kỳ của SV và ghi nhận có sai sót khi cộng điểm tổng câu 2..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setUnlockReasonDialog(null)} color="inherit">Hủy</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        disabled={saving || !unlockReasonText.trim()}
                        onClick={handleRequestUnlockSubmit}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                        sx={{ fontWeight: 700 }}
                    >
                        Gửi yêu cầu mở khóa
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Từ Chối Đơn Phúc Khảo */}
            <Dialog open={!!rejectAppealDialog} onClose={() => setRejectAppealDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Từ chối đơn phúc khảo</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Nhập lý do từ chối để phản hồi trực tiếp tới sinh viên <strong>{rejectAppealDialog?.student?.name}</strong>.
                    </Typography>
                    <TextField
                        autoFocus
                        multiline
                        rows={3}
                        fullWidth
                        label="Lý do từ chối phúc khảo"
                        value={rejectFeedbackText}
                        onChange={(e) => setRejectFeedbackText(e.target.value)}
                        placeholder="Ví dụ: Giảng viên đã rà soát lại bài thi, các bước giải và thang điểm được chấm hoàn toàn chính xác theo barem..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRejectAppealDialog(null)} color="inherit">Hủy</Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={saving || !rejectFeedbackText.trim()}
                        onClick={handleRejectAppealSubmit}
                        sx={{ fontWeight: 700 }}
                    >
                        Xác nhận từ chối
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Trả Lời / Phản Hồi Trực Tiếp Cho Sinh Viên */}
            <Dialog open={!!replyDialog} onClose={() => setReplyDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, color: 'info.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    💬 Trả lời phản hồi cho sinh viên
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Sinh viên: <strong>{replyDialog?.student?.name}</strong> ({replyDialog?.student?.code}) — Môn: <strong>{replyDialog?.course?.name}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, p: 1.5, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        <strong>Ý kiến của SV:</strong> {replyDialog?.reason}
                    </Typography>
                    <TextField
                        autoFocus
                        multiline
                        rows={4}
                        fullWidth
                        label="Nội dung phản hồi / giải thích của Giảng viên *"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ví dụ: Thầy đã rà soát lại bài thi của em, câu 3 được cộng thêm 0.5 điểm hoặc giải thích cụ thể điểm số..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReplyDialog(null)} color="inherit">Hủy</Button>
                    <Button
                        variant="contained"
                        color="info"
                        disabled={saving || !replyText.trim()}
                        onClick={handleReplySubmit}
                        sx={{ fontWeight: 700 }}
                    >
                        {saving ? 'Đang gửi...' : 'Gửi Câu Trả Lời Cho SV'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Gửi Ý Kiến Phúc Khảo Lên Admin */}
            <Dialog open={!!forwardToAdminDialog} onClose={() => setForwardToAdminDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                    📤 Gửi Ý Kiến & Đề Xuất Admin Mở Khóa Chấm Lại
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                        Ý kiến thẩm định của Thầy/Cô sẽ được chuyển trực tiếp đến Ban Quản Lý (Admin).
                        Admin sẽ phê duyệt mở khóa bảng điểm để Thầy/Cô chấm lại và cập nhật điểm phúc khảo cho sinh viên.
                    </Alert>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Sinh viên: <strong>{forwardToAdminDialog?.student?.name}</strong> ({forwardToAdminDialog?.student?.code})
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Môn học: <strong>{forwardToAdminDialog?.course?.name}</strong> — Mục điểm: <strong>{forwardToAdminDialog?.scoreType === 'midterm' ? 'Giữa kỳ (30%)' : forwardToAdminDialog?.scoreType === 'final' ? 'Cuối kỳ (60%)' : 'Chuyên cần (10%)'}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Điểm ban đầu: <strong style={{ color: '#dc2626' }}>{forwardToAdminDialog?.oldScore}đ</strong>
                        {forwardToAdminDialog?.proposedScore !== null && forwardToAdminDialog?.proposedScore !== undefined && (
                            <span style={{ color: '#4f46e5', marginLeft: 8 }}>
                                (SV tự đánh giá / mong muốn: <strong>{forwardToAdminDialog.proposedScore}đ</strong>)
                            </span>
                        )}
                    </Typography>
                    {forwardToAdminDialog?.reason && (
                        <Typography variant="body2" sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                            <strong>Lý do của SV:</strong> {forwardToAdminDialog.reason}
                            {forwardToAdminDialog.studentNote && (
                                <span style={{ display: 'block', marginTop: 4, fontStyle: 'italic', color: '#64748b' }}>
                                    Ghi chú thêm: {forwardToAdminDialog.studentNote}
                                </span>
                            )}
                        </Typography>
                    )}
                    <TextField
                        autoFocus
                        multiline
                        rows={4}
                        fullWidth
                        label="Ý kiến / Nhận xét của Giảng viên gửi Admin *"
                        value={forwardToAdminText}
                        onChange={(e) => setForwardToAdminText(e.target.value)}
                        placeholder="Ví dụ: Giảng viên đã xem xét bài thi của sinh viên này. Đề xuất Admin mở khóa bảng điểm để giảng viên kiểm tra & chấm lại bài thi..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setForwardToAdminDialog(null)} color="inherit">Hủy</Button>
                    <Button
                        variant="contained"
                        disabled={saving || !forwardToAdminText.trim()}
                        onClick={handleForwardToAdminSubmit}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                        sx={{ fontWeight: 700, bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
                    >
                        {saving ? 'Đang gửi...' : 'Gửi Admin Xin Mở Khóa'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Hội Thoại Chat với Sinh Viên */}
            <Dialog open={!!chatDialog} onClose={() => setChatDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, height: '80vh', display: 'flex', flexDirection: 'column' } }}>
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f0f9ff', borderBottom: '1px solid #bae6fd', py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Avatar
                            src={chatDialog?.student?.avatar}
                            alt={chatDialog?.student?.name}
                            sx={{ width: 36, height: 36, bgcolor: '#4f46e5', fontSize: '0.9rem', fontWeight: 700 }}
                        >
                            {String(chatDialog?.student?.name || 'S').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography fontWeight={800} fontSize="0.95rem" color="#1e1b4b">
                                Phúc Khảo Điểm: {chatDialog?.student?.name || 'Sinh viên'}
                            </Typography>
                            <Typography fontSize="0.75rem" color="text.secondary">
                                MSSV: <strong>{chatDialog?.student?.code || '—'}</strong>
                                {chatDialog?.student?.classCode && ` • Lớp: ${chatDialog.student.classCode}`}
                                {chatDialog?.course?.name && ` • Môn: ${chatDialog.course.name}`}
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        size="small"
                        label={{
                            'pending_teacher': 'Chờ GV xem xét',
                            'teacher_replied': 'GV đã trả lời',
                            'teacher_rejected': 'Đã từ chối',
                            'teacher_request_unlock': 'Chờ Admin duyệt',
                            'admin_unlocked': 'Admin đã mở khóa',
                            'teacher_re_submitted': 'Chờ Admin công bố',
                            'admin_approved_published': 'Đã hoàn tất'
                        }[chatDialog?.status] || chatDialog?.status}
                        color={chatDialog?.status === 'pending_teacher' ? 'warning' : chatDialog?.status === 'teacher_replied' ? 'info' : 'primary'}
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                </DialogTitle>
                <DialogContent sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2, gap: 1 }}>
                    {/* Thẻ tóm tắt thông tin phúc khảo */}
                    <Box sx={{ p: 1.5, bgcolor: '#fefce8', borderRadius: 2, border: '1px solid #fde68a', mb: 0.5, flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                            <Typography fontSize="0.75rem" fontWeight={700} color="#92400e">
                                Mục: <strong>{chatDialog?.scoreType === 'midterm' ? 'Giữa kỳ (30%)' : chatDialog?.scoreType === 'final' ? 'Cuối kỳ (60%)' : 'Chuyên cần (10%)'}</strong>
                            </Typography>
                            <Typography fontSize="0.75rem" fontWeight={700} color="#92400e">
                                Điểm hiện tại: <strong style={{ color: '#dc2626', fontSize: '0.85rem' }}>{chatDialog?.oldScore} đ</strong>
                                {chatDialog?.proposedScore !== null && chatDialog?.proposedScore !== undefined && (
                                    <span> ➜ SV mong muốn: <strong style={{ color: '#059669', fontSize: '0.85rem' }}>{chatDialog?.proposedScore} đ</strong></span>
                                )}
                            </Typography>
                        </Box>
                        <Typography fontSize="0.82rem" color="#78350f" sx={{ lineHeight: 1.45 }}>
                            <strong>Lý do của SV:</strong> {chatDialog?.reason}
                        </Typography>
                        {chatDialog?.studentNote && (
                            <Typography fontSize="0.75rem" color="#92400e" fontStyle="italic" sx={{ mt: 0.3 }}>
                                <strong>Ghi chú thêm:</strong> {chatDialog.studentNote}
                            </Typography>
                        )}
                    </Box>

                    {/* Thread tin nhắn */}
                    <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, pr: 0.5, py: 1 }}>
                        {(!chatDialog?.messages || chatDialog.messages.length === 0) && (
                            <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                                <Typography fontSize="0.85rem">Chưa có tin nhắn nào trong hội thoại.</Typography>
                                <Typography fontSize="0.75rem" color="text.secondary">Hãy nhập nội dung phản hồi phía dưới để trả lời sinh viên.</Typography>
                            </Box>
                        )}
                        {chatDialog?.messages?.map((msg, i) => {
                            const isTeacher = msg.role === 'teacher';
                            return (
                                <Box key={i} sx={{ display: 'flex', justifyContent: isTeacher ? 'flex-end' : 'flex-start' }}>
                                    <Box sx={{
                                        maxWidth: '82%',
                                        p: 1.5,
                                        borderRadius: isTeacher ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        bgcolor: isTeacher ? '#3730a3' : '#f1f5f9',
                                        color: isTeacher ? '#fff' : '#1e293b',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                                    }}>
                                        <Typography fontSize="0.7rem" fontWeight={700} sx={{ opacity: isTeacher ? 0.8 : 0.7, mb: 0.3 }}>
                                            {isTeacher ? '👨‍🏫 Bạn (Giảng viên)' : `👨‍🎓 ${msg.sender?.name || chatDialog?.student?.name || 'Sinh viên'}`}
                                        </Typography>
                                        <Typography fontSize="0.85rem" sx={{ lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</Typography>
                                        <Typography fontSize="0.68rem" sx={{ opacity: isTeacher ? 0.7 : 0.6, mt: 0.5, textAlign: 'right' }}>
                                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(msg.createdAt).toLocaleDateString('vi-VN') : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Ô nhập tin nhắn mới */}
                    <Box sx={{ display: 'flex', gap: 1, pt: 1.5, borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                        <TextField
                            size="small"
                            fullWidth
                            multiline
                            maxRows={3}
                            placeholder="Nhập phản hồi cho sinh viên (nhấn Enter để gửi)..."
                            value={chatText}
                            onChange={(e) => setChatText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                        <Button
                            variant="contained"
                            disabled={chatSending || !chatText.trim()}
                            onClick={handleSendChat}
                            sx={{ minWidth: 48, px: 2, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#3730a3' }, borderRadius: 3, fontWeight: 700 }}
                        >
                            {chatSending ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            size="small"
                            variant="contained"
                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
                            onClick={() => {
                                const target = chatDialog;
                                setChatDialog(null);
                                setForwardToAdminDialog(target);
                                setForwardToAdminText(target.teacherFeedback || `Giảng viên đã xem xét đơn phúc khảo của sinh viên ${target.student?.name} (${target.student?.code}) môn ${target.course?.name || ''}. Đề xuất Admin mở khóa bảng điểm để giảng viên kiểm tra & chấm lại bài thi.`);
                            }}
                        >
                            📤 Gửi Admin Xin Mở Khóa
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                            onClick={() => {
                                const target = chatDialog;
                                setChatDialog(null);
                                setRejectAppealDialog(target);
                                setRejectFeedbackText('');
                            }}
                        >
                            ❌ Giữ nguyên điểm
                        </Button>
                    </Box>
                    <Button onClick={() => setChatDialog(null)} color="inherit" size="small" sx={{ fontWeight: 600 }}>
                        Đóng hội thoại
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack?.severity || snack?.type || 'info'} onClose={() => setSnack(null)} sx={{ borderRadius: 2 }}>
                    {snack?.msg || snack?.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default GradeManagement;
