import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { io } from 'socket.io-client';
import {
    Box, Typography, Paper, TextField, MenuItem, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Stack,
    Chip, Alert, Card, alpha, CircularProgress, Fade, Avatar,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Tabs, Tab, Tooltip
} from '@mui/material';
import {
    Save as SaveIcon,
    HowToReg as AttIcon,
    Lock as LockIcon,
    History as HistoryIcon,
    CheckCircle as FinalizedIcon,
    Sync as SyncIcon
} from '@mui/icons-material';

const STATUS_OPTIONS = [
    { value: 'present', label: '✅ Có mặt', color: '#059669', bg: '#ecfdf5' },
    { value: 'late', label: '⏰ Đi muộn', color: '#D97706', bg: '#fffbeb' },
    { value: 'excused_absent', label: '📋 Nghỉ phép', color: '#2563EB', bg: '#eff6ff' },
    { value: 'unexcused_absent', label: '❌ Nghỉ K/P', color: '#DC2626', bg: '#fef2f2' },
];

const STATUS_LABELS = {
    present: { label: 'Có mặt', color: '#059669', bg: '#ecfdf5' },
    late: { label: 'Đi muộn', color: '#D97706', bg: '#fffbeb' },
    excused_absent: { label: 'Nghỉ phép', color: '#2563EB', bg: '#eff6ff' },
    unexcused_absent: { label: 'Vắng K/P', color: '#DC2626', bg: '#fef2f2' },
};

function AttendanceMark() {
    const [searchParams] = useSearchParams();
    const targetSectionId = searchParams.get('sectionId');
    const [tab, setTab] = useState(0); // 0 = Điểm danh, 1 = Lịch sử
    const [classSections, setClassSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [sectionInfo, setSectionInfo] = useState(null);
    const [sessionNumber, setSessionNumber] = useState(1);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState({});
    const [saving, setSaving] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [alert, setAlert] = useState(null);

    // Trạng thái buổi hiện tại đã chốt chưa
    const [currentSession, setCurrentSession] = useState(null); // { isFinalized, finalizedAt, finalizedBy }

    // Lịch sử điểm danh
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [expandedSession, setExpandedSession] = useState(null);

    // Dialog xác nhận chốt
    const [confirmFinalize, setConfirmFinalize] = useState(false);

    const studentsRef = useRef(students);
    useEffect(() => {
        studentsRef.current = students;
    }, [students]);

    // Tải lịch sử điểm danh của lớp
    const fetchHistory = useCallback(async (sectionId) => {
        const secId = sectionId || selectedSection;
        if (!secId) return;
        setHistoryLoading(true);
        try {
            const res = await axios.get(`/academic/attendance-history/${secId}`);
            if (res.data.success) {
                setHistory(res.data.sessions || []);
            }
        } catch (err) {
            console.error('Lỗi khi tải lịch sử:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, [selectedSection]);

    // Tải dữ liệu điểm danh của một buổi cụ thể và đồng bộ vào form
    const loadSessionData = useCallback(async (sectionId, sessNum, currentStudents) => {
        if (!sectionId || !sessNum) return;
        try {
            const res = await axios.get(`/academic/attendance-history/${sectionId}`);
            if (res.data.success) {
                const sess = (res.data.sessions || []).find(s => s.sessionNumber === Number(sessNum));
                setCurrentSession(sess || null);

                const stuList = (currentStudents && currentStudents.length > 0)
                    ? currentStudents
                    : (res.data.section?.students || studentsRef.current || []);

                if (sess) {
                    if (sess.date) setDate(sess.date);
                    const loaded = {};
                    stuList.forEach(s => {
                        loaded[s._id] = { status: 'present', note: '' };
                    });
                    (sess.records || []).forEach(r => {
                        const sid = (r.student?._id || r.student)?.toString();
                        if (sid) {
                            loaded[sid] = {
                                status: r.status || 'present',
                                note: r.note || ''
                            };
                        }
                    });
                    setRecords(loaded);
                } else {
                    // Buổi mới / chưa lưu: reset tất cả sinh viên về 'present'
                    const fresh = {};
                    stuList.forEach(s => {
                        fresh[s._id] = { status: 'present', note: '' };
                    });
                    setRecords(fresh);
                }
            }
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu buổi học:', err);
        }
    }, []);

    // Khởi tạo danh sách lớp học phần khi vào trang
    useEffect(() => {
        const fetchClassSections = async () => {
            try {
                const res = await axios.get('/academic/class-sections');
                if (res.data.success && res.data.data.length > 0) {
                    setClassSections(res.data.data);
                    const initialSection = (targetSectionId && res.data.data.find(s => s._id === targetSectionId)) 
                        ? res.data.data.find(s => s._id === targetSectionId) 
                        : res.data.data[0];
                    setSelectedSection(initialSection._id);
                    setSectionInfo(initialSection);
                    const stuList = initialSection.students || [];
                    setStudents(stuList);
                    await loadSessionData(initialSection._id, 1, stuList);
                    fetchHistory(initialSection._id);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchClassSections();
    }, [loadSessionData, fetchHistory, targetSectionId]);

    // Khi người dùng đổi lớp học phần
    const handleSectionChange = async (id) => {
        const sec = classSections.find(s => s._id === id);
        setSelectedSection(id);
        setSectionInfo(sec);
        const stuList = sec?.students || [];
        setStudents(stuList);
        setAlert(null);
        setCurrentSession(null);
        await loadSessionData(id, sessionNumber, stuList);
        fetchHistory(id);
    };

    // Khi người dùng đổi buổi học số (giới hạn cứng 1 đến 15)
    const handleSessionNumberChange = async (newSessNum) => {
        const clamped = Math.min(15, Math.max(1, parseInt(newSessNum) || 1));
        setSessionNumber(clamped);
        setAlert(null);
        await loadSessionData(selectedSection, clamped, studentsRef.current);
    };

    // Khi đổi tab sang Lịch sử
    useEffect(() => {
        if (tab === 1 && selectedSection) {
            fetchHistory(selectedSection);
        }
    }, [tab, selectedSection, fetchHistory]);

    // Socket realtime đồng bộ điểm danh
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_API_URL 
            ? import.meta.env.VITE_API_URL.replace('/api', '') 
            : 'http://127.0.0.1:5000';
        const socket = io(socketUrl);
        socket.on('attendance-updated', (data) => {
            if (data?.classSectionId === selectedSection) {
                loadSessionData(selectedSection, sessionNumber, studentsRef.current);
                fetchHistory(selectedSection);
            }
        });
        return () => {
            socket.disconnect();
        };
    }, [selectedSection, sessionNumber, loadSessionData, fetchHistory]);

    const setStatus = (studentId, status) => {
        if (currentSession?.isFinalized) return;
        setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
    };
    const setNote = (studentId, note) => {
        if (currentSession?.isFinalized) return;
        setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
    };

    const countByStatus = (status) => Object.values(records).filter(r => r.status === status).length;

    const handleSave = async () => {
        if (!selectedSection) { setAlert({ type: 'error', msg: 'Vui lòng chọn lớp học phần.' }); return; }
        if (currentSession?.isFinalized) {
            setAlert({ type: 'error', msg: '🔒 Buổi này đã được chốt. Không thể sửa đổi.' });
            return;
        }
        try {
            setSaving(true);
            setAlert(null);
            const stuList = studentsRef.current.length > 0 ? studentsRef.current : students;
            const recordsBody = stuList.map(s => ({
                student: s._id,
                status: records[s._id]?.status || 'present',
                note: records[s._id]?.note || ''
            }));
            const res = await axios.post('/academic/attendance', {
                classSectionId: selectedSection,
                sessionNumber: Number(sessionNumber),
                date,
                records: recordsBody
            });
            if (res.data.success) {
                setAlert({ type: 'success', msg: `✅ ${res.data.message}` });
                await loadSessionData(selectedSection, sessionNumber, stuList);
                fetchHistory(selectedSection);
            }
        } catch (err) {
            setAlert({ type: 'error', msg: err.response?.data?.message || 'Có lỗi xảy ra khi lưu điểm danh.' });
        } finally {
            setSaving(false);
        }
    };

    const handleFinalize = async () => {
        setConfirmFinalize(false);
        setFinalizing(true);
        try {
            // Tự động lưu bản ghi hiện tại trước khi chốt để đồng bộ hoàn toàn
            const stuList = studentsRef.current.length > 0 ? studentsRef.current : students;
            const recordsBody = stuList.map(s => ({
                student: s._id,
                status: records[s._id]?.status || 'present',
                note: records[s._id]?.note || ''
            }));
            await axios.post('/academic/attendance', {
                classSectionId: selectedSection,
                sessionNumber: Number(sessionNumber),
                date,
                records: recordsBody
            });

            const res = await axios.post('/academic/attendance/finalize', {
                classSectionId: selectedSection,
                sessionNumber: Number(sessionNumber)
            });
            if (res.data.success) {
                setAlert({ type: 'success', msg: `🔒 ${res.data.message}` });
                await loadSessionData(selectedSection, sessionNumber, stuList);
                fetchHistory(selectedSection);
            }
        } catch (err) {
            setAlert({ type: 'error', msg: err.response?.data?.message || 'Lỗi khi chốt điểm danh.' });
        } finally {
            setFinalizing(false);
        }
    };

    // Đồng bộ toàn bộ dữ liệu 15 buổi chuyên cần sang bảng điểm Grade
    const handleSyncToGrades = async () => {
        if (!selectedSection) {
            setAlert({ type: 'error', msg: 'Vui lòng chọn lớp học phần cần đồng bộ.' });
            return;
        }
        try {
            setSyncing(true);
            setAlert(null);
            const res = await axios.post('/academic/attendance/sync', { classSectionId: selectedSection });
            if (res.data.success) {
                setAlert({ type: 'success', msg: `🔄 ${res.data.message}` });
                fetchHistory(selectedSection);
            }
        } catch (err) {
            setAlert({ type: 'error', msg: err.response?.data?.message || 'Có lỗi xảy ra khi đồng bộ chuyên cần.' });
        } finally {
            setSyncing(false);
        }
    };

    // Danh sách các buổi đã chốt
    const finalizedSessions = (history || []).filter(s => s.isFinalized);

    // Tính số buổi đã chốt theo từng trạng thái
    const getFinalizedCount = (statusKey) => {
        if (finalizedSessions.length === 0) {
            return countByStatus(statusKey);
        }
        let count = 0;
        finalizedSessions.forEach(sess => {
            const hasStatus = (sess.records || []).some(r => r.status === statusKey);
            if (hasStatus) count++;
        });
        return count;
    };

    // Chi tiết từng sinh viên qua các buổi đã chốt
    const getStudentStats = (studentId) => {
        let present = 0, late = 0, excused = 0, unexcused = 0;
        finalizedSessions.forEach(sess => {
            const rec = (sess.records || []).find(r => 
                (r.student?._id || r.student)?.toString() === studentId?.toString()
            );
            if (rec) {
                if (rec.status === 'present') present++;
                else if (rec.status === 'late') late++;
                else if (rec.status === 'excused_absent') excused++;
                else if (rec.status === 'unexcused_absent') unexcused++;
            }
        });
        return { present, late, excused, unexcused, total: finalizedSessions.length };
    };

    const STAT_CARDS = [
        {
            key: 'present',
            label: 'Có mặt',
            color: '#059669',
            bg: '#ecfdf5',
            border: '#a7f3d0',
            icon: '✅'
        },
        {
            key: 'late',
            label: 'Đi muộn',
            color: '#D97706',
            bg: '#fffbeb',
            border: '#fde68a',
            icon: '⏰'
        },
        {
            key: 'excused_absent',
            label: 'Nghỉ có phép',
            color: '#2563EB',
            bg: '#eff6ff',
            border: '#bfdbfe',
            icon: '📋'
        },
        {
            key: 'unexcused_absent',
            label: 'Nghỉ không phép',
            color: '#DC2626',
            bg: '#fef2f2',
            border: '#fecaca',
            icon: '❌'
        },
    ];

    const isFinalized = currentSession?.isFinalized;
    const hasSessionData = !!currentSession;

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white',
                boxShadow: '0 20px 40px rgba(5, 150, 105, 0.3)'
            }}>
                <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
                    <AttIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800}>Điểm danh lớp học</Typography>
                    {isFinalized && (
                        <Chip icon={<LockIcon />} label="Đã chốt" size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700, ml: 1 }} />
                    )}
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.85 }}>
                    Ghi nhận sự hiện diện của sinh viên · Chốt điểm danh để khóa chỉnh sửa
                </Typography>
            </Box>

            {alert && (
                <Alert severity={alert.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}

            {/* Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}
                    sx={{ px: 2, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.95rem' } }}>
                    <Tab icon={<AttIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Điểm danh" />
                    <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Lịch sử điểm danh" />
                </Tabs>
            </Paper>

            {tab === 0 && (
                <>
                    {/* Controls Card - Redesigned UI/UX */}
                    <Paper elevation={0} sx={{
                        p: { xs: 2.5, md: 3 }, mb: 3.5, borderRadius: 3,
                        border: '1px solid', borderColor: 'divider',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                        background: '#ffffff'
                    }}>
                        {/* 1. Header: Tiêu đề và Trạng thái buổi học */}
                        <Box sx={{
                            display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between', gap: 1.5, mb: 2.5, pb: 2,
                            borderBottom: '1px solid', borderColor: 'divider'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 40, height: 40, borderRadius: 2.5,
                                    bgcolor: alpha('#059669', 0.1), color: '#059669',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '20px'
                                }}>
                                    ⚙️
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                                        Cấu Hình Buổi Điểm Danh
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        Chương trình chuẩn hóa 15 buổi học · Quản lý chuyên cần
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Badge trạng thái buổi học */}
                            {isFinalized ? (
                                <Chip
                                    icon={<LockIcon sx={{ fontSize: '15px !important', color: '#92400e !important' }} />}
                                    label={`Đã chốt lúc ${currentSession?.finalizedAt ? new Date(currentSession.finalizedAt).toLocaleString('vi-VN') : ''}`}
                                    sx={{
                                        bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '0.78rem',
                                        border: '1px solid #fde68a', px: 1, py: 2, borderRadius: 2
                                    }}
                                />
                            ) : (
                                <Chip
                                    label={`✏️ Đang điểm danh: Buổi ${sessionNumber}/15`}
                                    sx={{
                                        bgcolor: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: '0.78rem',
                                        border: '1px solid #a7f3d0', px: 1, py: 2, borderRadius: 2
                                    }}
                                />
                            )}
                        </Box>

                        {/* 2. Form Grid 3 Cột Cân Đối */}
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr 1fr' },
                            gap: 2.5, alignItems: 'start'
                        }}>
                            {/* Cột 1: Chọn lớp học phần */}
                            <TextField
                                select
                                fullWidth
                                label="Lớp học phần"
                                value={selectedSection}
                                onChange={(e) => handleSectionChange(e.target.value)}
                                helperText={sectionInfo ? `${sectionInfo.course?.name} — Phòng: ${sectionInfo.room || 'Chưa xếp'}` : ''}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                                {classSections.map(sec => (
                                    <MenuItem key={sec._id} value={sec._id}>
                                        <Box>
                                            <Typography fontWeight={600} fontSize="0.9rem">{sec.sectionCode}</Typography>
                                            <Typography variant="caption" color="text.secondary">{sec.course?.name}</Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>

                            {/* Cột 2: Chọn Buổi học số (Dropdown cố định 1 đến 15) */}
                            <TextField
                                select
                                fullWidth
                                label="Buổi học số"
                                value={sessionNumber}
                                disabled={saving || finalizing}
                                onChange={(e) => handleSessionNumberChange(e.target.value)}
                                helperText="Chọn buổi học từ 1 đến 15"
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                                {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => {
                                    const sess = (history || []).find(s => s.sessionNumber === num);
                                    const isFin = sess?.isFinalized;
                                    const isDone = !!sess;
                                    return (
                                        <MenuItem key={num} value={num}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                                <Typography fontWeight={600} fontSize="0.88rem">Buổi {num}</Typography>
                                                {isFin ? (
                                                    <Chip label="Đã chốt" size="small" sx={{ height: 19, fontSize: '0.66rem', bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700 }} />
                                                ) : isDone ? (
                                                    <Chip label="Đã lưu" size="small" sx={{ height: 19, fontSize: '0.66rem', bgcolor: '#ecfdf5', color: '#059669', fontWeight: 700 }} />
                                                ) : (
                                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>Chưa điểm danh</Typography>
                                                )}
                                            </Box>
                                        </MenuItem>
                                    );
                                })}
                            </TextField>

                            {/* Cột 3: Ngày điểm danh */}
                            <TextField
                                type="date"
                                fullWidth
                                label="Ngày điểm danh"
                                value={date}
                                InputLabelProps={{ shrink: true }}
                                disabled={isFinalized}
                                onChange={(e) => setDate(e.target.value)}
                                helperText="Định dạng: Ngày / Tháng / Năm"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        </Box>

                        {/* 3. Action Toolbar Tách Riêng - Thoáng đãng & Hiện Đại */}
                        <Box sx={{
                            mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: alpha('#000000', 0.06),
                            display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' },
                            justifyContent: 'space-between', gap: 2
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                                    📍 <strong>{sectionInfo?.course?.name || 'Môn học'}</strong> — Đang chọn <strong>Buổi {sessionNumber}/15</strong>
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1.5} sx={{ justifyContent: { xs: 'flex-end', sm: 'auto' }, flexWrap: 'wrap', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    size="medium"
                                    startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                                    onClick={handleSyncToGrades}
                                    disabled={syncing || !selectedSection}
                                    sx={{
                                        fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 2, py: 1,
                                        borderColor: '#2563eb', color: '#2563eb',
                                        '&:hover': { bgcolor: alpha('#2563eb', 0.06), borderColor: '#1d4ed8' }
                                    }}
                                >
                                    {syncing ? 'Đang đồng bộ...' : 'Đồng bộ sang Bảng điểm'}
                                </Button>

                                {!isFinalized ? (
                                    <>
                                        <Button
                                            variant="outlined"
                                            size="medium"
                                            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                                            onClick={handleSave}
                                            disabled={saving || finalizing}
                                            sx={{
                                                fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 2.5, py: 1,
                                                borderColor: '#059669', color: '#059669',
                                                '&:hover': { bgcolor: alpha('#059669', 0.06), borderColor: '#047857' }
                                            }}
                                        >
                                            {saving ? 'Đang lưu...' : 'Lưu buổi học'}
                                        </Button>

                                        <Button
                                            variant="contained"
                                            size="medium"
                                            startIcon={finalizing ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
                                            onClick={() => setConfirmFinalize(true)}
                                            disabled={finalizing || saving}
                                            sx={{
                                                fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 3, py: 1,
                                                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                                boxShadow: '0 4px 14px rgba(220,38,38,0.28)',
                                                '&:hover': { background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }
                                            }}
                                        >
                                            {finalizing ? 'Đang chốt...' : `🔒 Chốt buổi ${sessionNumber}`}
                                        </Button>
                                    </>
                                ) : (
                                    <Chip
                                        icon={<LockIcon sx={{ fontSize: 16 }} />}
                                        label={`Buổi ${sessionNumber} đã chốt (Khóa sửa đổi)`}
                                        sx={{
                                            fontWeight: 700, borderRadius: 2, px: 1.5, py: 2.2,
                                            bgcolor: alpha('#d97706', 0.12), color: '#92400e',
                                            border: '1px solid #fde68a'
                                        }}
                                    />
                                )}
                            </Stack>
                        </Box>
                    </Paper>

                    {/* Finalized Banner */}
                    {isFinalized && (
                        <Alert severity="warning" icon={<LockIcon />} sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>
                            🔒 Buổi điểm danh số <strong>{sessionNumber}</strong> đã được chốt vào{' '}
                            <strong>{new Date(currentSession.finalizedAt).toLocaleString('vi-VN')}</strong>.
                            Giảng viên không thể sửa đổi sau khi chốt.
                        </Alert>
                    )}

                    {/* Stats: 4 ô Có mặt, Đi muộn, Nghỉ có phép, Nghỉ không phép */}
                    {students.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5
                            }}>
                                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                                    📊 Thống kê các buổi học {finalizedSessions.length > 0 ? `(${finalizedSessions.length} buổi đã chốt)` : `(Buổi ${sessionNumber})`}
                                </Typography>
                                <Chip 
                                    size="small" 
                                    label={`Tổng số: ${students.length} sinh viên`}
                                    sx={{ fontWeight: 700, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }} 
                                />
                            </Box>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                                gap: 2.5, width: '100%'
                            }}>
                                {STAT_CARDS.map(card => {
                                    const finCount = getFinalizedCount(card.key);
                                    const curCount = countByStatus(card.key);
                                    return (
                                        <Card key={card.key} elevation={0} sx={{
                                            border: '2px solid',
                                            borderColor: card.border,
                                            bgcolor: card.bg,
                                            borderRadius: 3,
                                            textAlign: 'center',
                                            p: 2.5,
                                            transition: 'all 0.2s ease',
                                            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }
                                        }}>
                                            <Typography fontSize="2rem" mb={0.5}>{card.icon}</Typography>
                                            <Typography variant="h3" fontWeight={800} sx={{ color: card.color, lineHeight: 1.1 }}>
                                                {finalizedSessions.length > 0 ? finCount : curCount}
                                                <Typography component="span" variant="body1" fontWeight={700} sx={{ color: card.color, ml: 0.5 }}>
                                                    {finalizedSessions.length > 0 ? 'buổi' : 'SV'}
                                                </Typography>
                                            </Typography>
                                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: card.color, mt: 0.5 }}>
                                                {card.label}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: 0.5 }}>
                                                {finalizedSessions.length > 0 
                                                    ? `Buổi ${sessionNumber}: ${curCount} SV · Đã chốt: ${finCount} buổi`
                                                    : `Buổi ${sessionNumber}: ${curCount} sinh viên`
                                                }
                                            </Typography>
                                        </Card>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* Attendance Table */}
                    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', opacity: isFinalized ? 0.8 : 1 }}>
                        {students.length > 0 ? (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: alpha('#059669', 0.04) }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary' }}>Sinh viên</TableCell>
                                            {STATUS_OPTIONS.map(opt => (
                                                <TableCell key={opt.value} align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', minWidth: 100 }}>
                                                    {opt.label}
                                                </TableCell>
                                            ))}
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary' }}>Ghi chú buổi học</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {students.map((student, idx) => (
                                            <Fade in key={student._id} timeout={150 + idx * 30}>
                                                <TableRow hover sx={{ '&:hover': { bgcolor: alpha('#059669', 0.03) } }}>
                                                    <TableCell>
                                                        <Stack direction="row" alignItems="center" gap={1.5}>
                                                            <Avatar src={student.avatar} alt={student.name} sx={{ width: 36, height: 36 }} />
                                                            <Box>
                                                                <Typography fontWeight={600} fontSize="0.85rem">{student.name}</Typography>
                                                                <Typography variant="caption" color="text.secondary" fontFamily="monospace">{student.code}</Typography>
                                                                <Box sx={{ display: 'flex', gap: 0.6, mt: 0.5, flexWrap: 'wrap' }}>
                                                                    <Chip size="small" label={`Có mặt: ${getStudentStats(student._id).present}`} 
                                                                        sx={{ height: 19, fontSize: '0.66rem', fontWeight: 700, bgcolor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }} />
                                                                    <Chip size="small" label={`Muộn: ${getStudentStats(student._id).late}`} 
                                                                        sx={{ height: 19, fontSize: '0.66rem', fontWeight: 700, bgcolor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }} />
                                                                    <Chip size="small" label={`Phép: ${getStudentStats(student._id).excused}`} 
                                                                        sx={{ height: 19, fontSize: '0.66rem', fontWeight: 700, bgcolor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }} />
                                                                    <Chip size="small" label={`K/P: ${getStudentStats(student._id).unexcused}`} 
                                                                        sx={{ height: 19, fontSize: '0.66rem', fontWeight: 700, bgcolor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} />
                                                                </Box>
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <TableCell key={opt.value} align="center">
                                                            <Tooltip title={isFinalized ? 'Đã chốt - không thể sửa' : opt.label}>
                                                                <Box
                                                                    onClick={() => setStatus(student._id, opt.value)}
                                                                    sx={{
                                                                        width: 32, height: 32, borderRadius: '50%', mx: 'auto',
                                                                        cursor: isFinalized ? 'not-allowed' : 'pointer',
                                                                        border: '2px solid',
                                                                        borderColor: records[student._id]?.status === opt.value ? opt.color : 'divider',
                                                                        bgcolor: records[student._id]?.status === opt.value ? opt.bg : 'transparent',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        transition: 'all 0.15s ease',
                                                                        '&:hover': isFinalized ? {} : { borderColor: opt.color, bgcolor: opt.bg }
                                                                    }}
                                                                >
                                                                    {records[student._id]?.status === opt.value && (
                                                                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: opt.color }} />
                                                                    )}
                                                                </Box>
                                                            </Tooltip>
                                                        </TableCell>
                                                    ))}
                                                    <TableCell>
                                                        <TextField
                                                            size="small" variant="standard" placeholder="Nhập ghi chú..."
                                                            value={records[student._id]?.note || ''}
                                                            disabled={isFinalized}
                                                            onChange={(e) => setNote(student._id, e.target.value)}
                                                            sx={{
                                                                minWidth: 160,
                                                                '& .MuiInputBase-input': {
                                                                    color: '#111827 !important',
                                                                    fontSize: '0.82rem',
                                                                    WebkitTextFillColor: isFinalized ? '#9ca3af' : '#111827',
                                                                },
                                                                '& .MuiInputBase-input::placeholder': {
                                                                    color: '#6b7280', opacity: 1,
                                                                    WebkitTextFillColor: '#6b7280',
                                                                },
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            </Fade>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box sx={{ p: 6, textAlign: 'center' }}>
                                <AttIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                <Typography color="text.secondary">
                                    {classSections.length === 0 ? 'Không có lớp học phần nào.' : 'Lớp học này chưa có sinh viên đăng ký.'}
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* Action Buttons */}
                    {students.length > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
                            {/* Nút Lưu - disable khi đã chốt */}
                            <Tooltip title={isFinalized ? 'Buổi này đã chốt - không thể lưu thêm' : ''}>
                                <span>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
                                        onClick={handleSave}
                                        disabled={saving || isFinalized}
                                        sx={{
                                            px: 4, py: 1.5, borderRadius: 2, fontWeight: 700,
                                            borderColor: '#059669', color: '#059669',
                                            '&:hover': { bgcolor: alpha('#059669', 0.06) },
                                            '&.Mui-disabled': { opacity: 0.5 }
                                        }}
                                    >
                                        {saving ? 'Đang lưu...' : `Lưu điểm danh buổi ${sessionNumber}`}
                                    </Button>
                                </span>
                            </Tooltip>

                            {/* Nút Chốt - luôn hiện khi chưa chốt */}
                            {!isFinalized && (
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={finalizing ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                                    onClick={() => setConfirmFinalize(true)}
                                    disabled={finalizing || saving}
                                    sx={{
                                        px: 4, py: 1.5, borderRadius: 2, fontWeight: 700,
                                        background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                        boxShadow: '0 8px 24px rgba(220,38,38,0.3)',
                                        '&:hover': { background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }
                                    }}
                                >
                                    {finalizing ? 'Đang chốt...' : `🔒 Chốt điểm danh buổi ${sessionNumber}`}
                                </Button>
                            )}

                            {/* Badge đã chốt */}
                            {isFinalized && (
                                <Button variant="contained" disabled size="large"
                                    startIcon={<FinalizedIcon />}
                                    sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: 700, bgcolor: '#d97706', color: 'white' }}>
                                    🔒 Đã chốt điểm danh buổi {sessionNumber}
                                </Button>
                            )}
                        </Box>
                    )}
                </>
            )}

            {tab === 1 && (
                /* Lịch sử điểm danh */
                <Box>
                    {/* Section selector for history */}
                    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" fontWeight={700} mb={2}>📋 Chọn lớp để xem lịch sử</Typography>
                        <TextField select fullWidth label="Lớp học phần" value={selectedSection}
                            onChange={(e) => handleSectionChange(e.target.value)}
                            sx={{ maxWidth: 400, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                            {classSections.map(sec => (
                                <MenuItem key={sec._id} value={sec._id}>
                                    <Box>
                                        <Typography fontWeight={600}>{sec.sectionCode}</Typography>
                                        <Typography variant="caption" color="text.secondary">{sec.course?.name}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Paper>

                    {historyLoading ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <CircularProgress sx={{ color: '#059669' }} />
                            <Typography mt={2} color="text.secondary">Đang tải lịch sử 15 buổi...</Typography>
                        </Box>
                    ) : (
                        <Stack spacing={2}>
                            {Array.from({ length: 15 }, (_, i) => i + 1).map((sessNum) => {
                                const sess = (history || []).find(s => s.sessionNumber === sessNum);
                                const isSessFinalized = sess?.isFinalized;
                                const isExpanded = expandedSession === sessNum;

                                if (!sess) {
                                    // Buổi chưa điểm danh
                                    return (
                                        <Paper key={sessNum} elevation={0} sx={{
                                            borderRadius: 3, border: '2px dashed #cbd5e1',
                                            bgcolor: alpha('#f8fafc', 0.7), p: 2,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                                        }}>
                                            <Stack direction="row" alignItems="center" gap={2}>
                                                <Box sx={{
                                                    width: 44, height: 44, borderRadius: 2,
                                                    bgcolor: '#f1f5f9', border: '1.5px dashed #94a3b8',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#64748b', fontWeight: 800, fontSize: '1.1rem'
                                                }}>
                                                    {sessNum}
                                                </Box>
                                                <Box>
                                                    <Typography fontWeight={700} color="text.secondary">
                                                        Buổi {sessNum} — Chưa diễn ra / Chưa điểm danh
                                                    </Typography>
                                                    <Typography variant="caption" color="text.disabled">
                                                        Kế hoạch buổi học {sessNum} của học phần
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => {
                                                    setTab(0);
                                                    handleSessionNumberChange(sessNum);
                                                }}
                                                sx={{
                                                    borderRadius: 2, textTransform: 'none', fontWeight: 700,
                                                    borderColor: '#059669', color: '#059669',
                                                    '&:hover': { bgcolor: alpha('#059669', 0.08) }
                                                }}
                                            >
                                                📝 Điểm danh buổi {sessNum}
                                            </Button>
                                        </Paper>
                                    );
                                }

                                // Buổi đã có bản ghi
                                return (
                                    <Paper key={sessNum} elevation={0} sx={{
                                        borderRadius: 3, border: '2px solid',
                                        borderColor: isSessFinalized ? '#d97706' : '#059669',
                                        overflow: 'hidden',
                                        transition: 'box-shadow 0.2s',
                                        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }
                                    }}>
                                        {/* Session Header */}
                                        <Box sx={{
                                            px: 3, py: 2,
                                            bgcolor: isSessFinalized ? alpha('#d97706', 0.06) : alpha('#059669', 0.04),
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            cursor: 'pointer'
                                        }} onClick={() => setExpandedSession(isExpanded ? null : sessNum)}>
                                            <Stack direction="row" alignItems="center" gap={2}>
                                                <Box sx={{
                                                    width: 44, height: 44, borderRadius: 2,
                                                    bgcolor: isSessFinalized ? '#d97706' : '#059669',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                                    fontWeight: 800, fontSize: '1.1rem'
                                                }}>
                                                    {sess.sessionNumber}
                                                </Box>
                                                <Box>
                                                    <Typography fontWeight={700}>Buổi {sess.sessionNumber} — {sess.date}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {sess.records?.length || 0} sinh viên · GV: {sess.takenBy?.name || 'Giảng viên'}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Stack direction="row" alignItems="center" gap={1}>
                                                {isSessFinalized ? (
                                                    <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Đã chốt"
                                                        size="small" sx={{ bgcolor: '#d97706', color: 'white', fontWeight: 700 }} />
                                                ) : (
                                                    <Chip label="Chưa chốt" size="small" variant="outlined"
                                                        sx={{ borderColor: '#059669', color: '#059669', fontWeight: 700 }} />
                                                )}
                                                {!isSessFinalized && (
                                                    <Button size="small" variant="text"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTab(0);
                                                            handleSessionNumberChange(sess.sessionNumber);
                                                        }}
                                                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', color: '#059669' }}>
                                                        ✏️ Chỉnh sửa
                                                    </Button>
                                                )}
                                                <Typography variant="caption" color="text.secondary">
                                                    {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết'}
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        {/* Session Detail */}
                                        {isExpanded && (
                                            <Box sx={{ p: 3 }}>
                                                {isSessFinalized && (
                                                    <Alert severity="warning" icon={<LockIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                                                        Chốt lúc <strong>{new Date(sess.finalizedAt).toLocaleString('vi-VN')}</strong>
                                                        {sess.finalizedBy?.name && ` bởi ${sess.finalizedBy.name}`}
                                                    </Alert>
                                                )}
                                                <TableContainer>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow sx={{ bgcolor: alpha('#059669', 0.04) }}>
                                                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sinh viên</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Trạng thái</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Ghi chú</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {sess.records?.map((rec, i) => {
                                                                const stInfo = STATUS_LABELS[rec.status] || { label: rec.status, color: '#6b7280', bg: '#f3f4f6' };
                                                                return (
                                                                    <TableRow key={i} hover>
                                                                        <TableCell>
                                                                            <Typography fontWeight={600} fontSize="0.83rem">
                                                                                {rec.student?.name || `SV #${i + 1}`}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                                                                                {rec.student?.code || ''}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Chip label={stInfo.label} size="small"
                                                                                sx={{ bgcolor: stInfo.bg, color: stInfo.color, fontWeight: 700, fontSize: '0.73rem' }} />
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Typography fontSize="0.82rem" color="text.secondary">
                                                                                {rec.note || '—'}
                                                                            </Typography>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>
                                        )}
                                    </Paper>
                                );
                            })}
                        </Stack>
                    )}
                </Box>
            )}

            {/* Dialog xác nhận chốt */}
            <Dialog open={confirmFinalize} onClose={() => setConfirmFinalize(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockIcon sx={{ color: '#dc2626' }} /> Xác nhận chốt điểm danh
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn chắc chắn muốn <strong>chốt điểm danh buổi {sessionNumber}</strong>?
                        <br /><br />
                        Sau khi chốt, <strong>giảng viên và sinh viên sẽ không thể sửa đổi</strong>. Chỉ Admin mới có thể chỉnh sửa hoặc bỏ chốt.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={() => setConfirmFinalize(false)} variant="outlined" sx={{ borderRadius: 2 }}>Huỷ</Button>
                    <Button onClick={handleFinalize} variant="contained" startIcon={<LockIcon />}
                        sx={{ borderRadius: 2, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
                        Xác nhận chốt
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default AttendanceMark;
