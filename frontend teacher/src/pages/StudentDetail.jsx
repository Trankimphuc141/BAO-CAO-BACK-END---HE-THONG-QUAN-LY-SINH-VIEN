import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Paper, Tabs, Tab, Grid, Avatar, Divider, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Button, TextField, Dialog,
    DialogTitle, DialogContent, DialogActions, MenuItem, IconButton, Card,
    CardContent, Stack, Alert, Tooltip, alpha, Chip, LinearProgress, CircularProgress
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon,
    School as SchoolIcon, EventNote as AttendanceIcon, StickyNote2 as NoteIcon,
    Grade as GradeIcon, Person as PersonIcon, CheckCircle, Cancel, AccessTime,
    EmojiEvents as TrophyIcon, Sync as SyncIcon, Lock as LockIcon
} from '@mui/icons-material';

// Map điểm chữ → màu sắc hiển thị
const GRADE_COLORS = { 'A': '#059669', 'B+': '#2563EB', 'B': '#3B82F6', 'C+': '#D97706', 'C': '#F59E0B', 'D+': '#EA580C', 'D': '#F97316', 'F': '#DC2626' };

function ScoreDisplay({ value, max = 10 }) {
    const pct = Math.min(100, (value / max) * 100);
    const color = pct >= 80 ? '#059669' : pct >= 65 ? '#2563EB' : pct >= 50 ? '#D97706' : '#DC2626';
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography fontWeight={700} fontSize="0.9rem" sx={{ color, minWidth: 28 }}>{value}</Typography>
            <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: alpha(color, 0.15), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
        </Box>
    );
}

function StudentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [classSections, setClassSections] = useState([]);

    // Grade dialog
    const [openGradeDialog, setOpenGradeDialog] = useState(false);
    const [editingGrade, setEditingGrade] = useState(null);
    const [viewingAttendanceGrade, setViewingAttendanceGrade] = useState(null);
    const [gradeAlert, setGradeAlert] = useState(null);
    const [syncingAttendance, setSyncingAttendance] = useState(false);
    const [gradeForm, setGradeForm] = useState({
        classSection: '', course: '', semester: 'HK1-2026-2027',
        sessionScores: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
        attendanceScore: 10, midtermScore: 0, finalScore: 0
    });

    // Helper đếm số buổi có mặt trong tối đa 15 buổi
    const getAttendedCount = (grade) => {
        if (!grade) return 15;
        if (grade.sessionScores && Array.isArray(grade.sessionScores) && grade.sessionScores.length > 0) {
            return grade.sessionScores.filter(s => Number(s) >= 5).length;
        }
        return Math.round(((grade.attendanceScore ?? 10) / 10) * 15);
    };

    // Helper xác định điểm / trạng thái điểm danh cho từng buổi (Buổi 1 đến 15)
    const getSessionAttendance = (grade, sessionNum) => {
        // 1. Kiểm tra sessionScores lưu trong bản ghi điểm
        if (grade.sessionScores && grade.sessionScores.length >= sessionNum) {
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

        // 2. Kiểm tra từ lịch sử điểm danh thực tế của lớp học phần
        const targetSectionId = grade.classSection?._id || grade.classSection;
        const courseId = grade.course?._id || grade.course;

        const attDoc = (studentData?.attendance || []).find(a => {
            const aSecId = a.classSection?._id || a.classSection;
            if (targetSectionId && String(aSecId) === String(targetSectionId)) {
                return Number(a.sessionNumber) === sessionNum;
            }
            const sec = classSections.find(cs => String(cs._id) === String(aSecId));
            const secCourseId = sec?.course?._id || sec?.course;
            return String(secCourseId) === String(courseId) && Number(a.sessionNumber) === sessionNum;
        });

        if (attDoc) {
            const rec = attDoc.records?.find(r => String(r.student?._id || r.student) === String(id));
            if (rec) {
                if (rec.status === 'present') return { score: 10, label: '100%', tooltip: `Buổi ${sessionNum}: Có mặt (100%)`, status: 'good' };
                if (rec.status === 'late') return { score: 5, label: '50%', tooltip: `Buổi ${sessionNum}: Đi muộn (50%)`, status: 'warning' };
                if (rec.status === 'excused_absent') return { score: 0, label: '0%', tooltip: `Buổi ${sessionNum}: Vắng có phép (0%, -6.67%)`, status: 'danger' };
                if (rec.status === 'unexcused_absent') return { score: 0, label: '0%', tooltip: `Buổi ${sessionNum}: Vắng không phép (0%, -6.67%)`, status: 'danger' };
            }
        }

        // Fallback mặc định
        const def = grade.attendanceScore !== undefined ? grade.attendanceScore : 10;
        const pct = def === 10 ? '100%' : def === 5 ? '50%' : def === 0 ? '0%' : `${(def * 10).toFixed(0)}%`;
        return {
            score: def,
            label: pct,
            tooltip: `Buổi ${sessionNum}: ${pct}`,
            status: def >= 8 ? 'good' : def >= 5 ? 'warning' : 'danger'
        };
    };

    // Note dialog
    const [openNoteDialog, setOpenNoteDialog] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [deleteGradeConfirm, setDeleteGradeConfirm] = useState(null);
    const [deleteNoteConfirm, setDeleteNoteConfirm] = useState(null);

    const fetchStudentDetails = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/teacher/students/${id}`);
            if (res.data.success) setStudentData(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [id]);

    const fetchClassSections = useCallback(async () => {
        try {
            const res = await axios.get('/academic/class-sections');
            if (res.data.success) setClassSections(res.data.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { fetchStudentDetails(); fetchClassSections(); }, [id]);

    const calcGPA = () => {
        const grades = studentData?.grades || [];
        if (!grades.length) return { gpa4: 0, gpa10: 0, credits: 0, passed: 0 };
        let totalCreds = 0, w4 = 0, w10 = 0, passed = 0;
        grades.forEach(g => {
            const c = g.course?.credits || 3;
            totalCreds += c;
            w4 += (g.totalScore4 || 0) * c;
            w10 += (g.totalScore10 || 0) * c;
            if (g.isPassed) passed += c;
        });
        return { gpa4: (w4 / totalCreds).toFixed(2), gpa10: (w10 / totalCreds).toFixed(2), credits: totalCreds, passed };
    };

    // When a class section is selected, auto-fill the course
    const handleSectionChange = (sectionId) => {
        const sec = classSections.find(s => s._id === sectionId);
        setGradeForm(prev => ({
            ...prev,
            classSection: sectionId,
            course: sec?.course?._id || sec?.course || ''
        }));
    };

    const handleOpenAddGrade = () => {
        // Tìm lớp học phần chưa được nhập điểm
        const availableSec = classSections.find(sec => !(studentData?.grades || []).some(g => String(g.classSection?._id || g.classSection) === String(sec._id)));
        const defaultSec = availableSec || classSections[0];
        setGradeForm({
            classSection: defaultSec?._id || '',
            course: defaultSec?.course?._id || defaultSec?.course || '',
            semester: 'HK1-2026-2027',
            sessionScores: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
            attendanceScore: 10, midtermScore: 0, finalScore: 0
        });
        setEditingGrade(null);
        setGradeAlert(null);
        setOpenGradeDialog(true);
    };

    const handleOpenEditGrade = (g) => {
        setGradeAlert({ type: 'warning', msg: 'Theo quy chế đào tạo, điểm môn học đã được nhập và khóa cố định vào hệ thống, không thể chỉnh sửa!' });
    };

    const handleSaveGrade = async (e) => {
        e.preventDefault();
        try {
            setGradeAlert(null);
            if (editingGrade) {
                setGradeAlert({ type: 'error', msg: 'Theo quy chế đào tạo, điểm môn học đã nhập vào hệ thống không thể chỉnh sửa!' });
                return;
            }
            // Validate: classSection and course must be selected
            if (!gradeForm.classSection || !gradeForm.course) {
                setGradeAlert({ type: 'error', msg: 'Vui lòng chọn lớp học phần để hệ thống tự động xác định môn học.' });
                return;
            }
            // Kiểm tra xem môn này đã có điểm chưa
            const alreadyGraded = (studentData?.grades || []).some(
                g => String(g.classSection?._id || g.classSection) === String(gradeForm.classSection)
            );
            if (alreadyGraded) {
                setGradeAlert({ type: 'error', msg: 'Lớp học phần này đã được nhập điểm trước đó. Theo quy chế đào tạo, điểm đã nhập không thể chỉnh sửa hoặc nhập đè!' });
                return;
            }

            const payload = {
                classSection: gradeForm.classSection,
                course: gradeForm.course,
                semester: gradeForm.semester,
                sessionScores: gradeForm.sessionScores || Array(15).fill(10),
                attendanceScore: Number(gradeForm.attendanceScore),
                midtermScore: Number(gradeForm.midtermScore),
                finalScore: Number(gradeForm.finalScore)
            };
            await axios.post(`/teacher/students/${id}/grades`, payload);
            setOpenGradeDialog(false);
            fetchStudentDetails();
        } catch (err) {
            setGradeAlert({ type: 'error', msg: err.response?.data?.message || 'Có lỗi khi lưu điểm. Vui lòng thử lại.' });
        }
    };

    const handleDeleteGrade = async () => {
        try {
            await axios.delete(`/teacher/grades/${deleteGradeConfirm._id}`);
            setDeleteGradeConfirm(null);
            fetchStudentDetails();
        } catch (err) { console.error(err); }
    };

    // Đồng bộ điểm danh 15 buổi sang bảng điểm
    const handleSyncAttendance = async () => {
        try {
            setSyncingAttendance(true);
            const res = await axios.post('/academic/attendance/sync-all');
            if (res.data.success) {
                await fetchStudentDetails();
            }
        } catch (err) {
            console.error('Lỗi khi đồng bộ điểm chuyên cần:', err);
        } finally {
            setSyncingAttendance(false);
        }
    };

    const handleSaveNote = async (e) => {
        e.preventDefault();
        try {
            if (editingNoteId) await axios.put(`/teacher/notes/${editingNoteId}`, { content: noteContent });
            else await axios.post(`/teacher/students/${id}/notes`, { content: noteContent });
            setOpenNoteDialog(false);
            fetchStudentDetails();
        } catch (err) { console.error(err); }
    };

    const handleDeleteNote = async () => {
        try {
            await axios.delete(`/teacher/notes/${deleteNoteConfirm._id}`);
            setDeleteNoteConfirm(null);
            fetchStudentDetails();
        } catch (err) { console.error(err); }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
            <CircularProgress size={50} />
            <Typography color="text.secondary">Đang tải dữ liệu sinh viên...</Typography>
        </Box>
    );
    if (!studentData) return <Alert severity="error">Không tìm thấy thông tin sinh viên.</Alert>;

    const { student, grades, attendance, notes } = studentData;
    const gpa = calcGPA();

    // Preview tổng điểm trước khi lưu (dùng công thức 10%+30%+60%)
    const previewTotal = +(gradeForm.attendanceScore * 0.1 + gradeForm.midtermScore * 0.3 + gradeForm.finalScore * 0.6).toFixed(2);

    return (
        <Box>
            {/* Back button */}
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/students')} sx={{ mb: 3, color: 'text.secondary' }}>
                Quay lại danh sách
            </Button>

            {/* Hero Header */}
            <Paper elevation={0} sx={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white', overflow: 'hidden', position: 'relative'
            }}>
                {/* Decorative blobs */}
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
                <Box sx={{ position: 'absolute', bottom: -60, right: 100, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />

                <Grid container spacing={3} alignItems="center" sx={{ position: 'relative' }}>
                    <Grid item>
                        <Avatar src={student.avatar} alt={student.name}
                            sx={{ width: 90, height: 90, border: '3px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
                    </Grid>
                    <Grid item xs>
                        <Typography variant="h4" fontWeight={800} gutterBottom>{student.name}</Typography>
                        <Stack direction="row" gap={2} flexWrap="wrap">
                            <Chip label={`MSSV: ${student.code}`} sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, fontFamily: 'monospace' }} />
                            <Chip label={student.classCode} sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }} />
                            <Chip label={student.status || 'Đang học'} sx={{ bgcolor: 'rgba(16,185,129,0.3)', color: '#a7f3d0', fontWeight: 700, border: '1px solid rgba(167,243,208,0.5)' }} />
                        </Stack>
                    </Grid>
                    {/* GPA Cards */}
                    <Grid item>
                        <Stack direction="row" gap={2}>
                            {[
                                { label: 'GPA Hệ 4', value: gpa.gpa4, icon: <TrophyIcon /> },
                                { label: 'Điểm TB', value: gpa.gpa10, icon: <GradeIcon /> },
                                { label: 'Tổng TC', value: gpa.credits, icon: <SchoolIcon /> }
                            ].map(item => (
                                <Box key={item.label} sx={{
                                    textAlign: 'center', bgcolor: 'rgba(255,255,255,0.12)',
                                    backdropFilter: 'blur(10px)', borderRadius: 3, px: 2.5, py: 2,
                                    border: '1px solid rgba(255,255,255,0.2)', minWidth: 90
                                }}>
                                    <Box sx={{ mb: 0.5, opacity: 0.7 }}>{item.icon}</Box>
                                    <Typography variant="h5" fontWeight={800}>{item.value}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>{item.label}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}
                    sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2, pt: 1,
                        '& .MuiTab-root': { fontWeight: 600, minHeight: 48, textTransform: 'none' },
                        '& .Mui-selected': { color: '#4F46E5' },
                        '& .MuiTabs-indicator': { bgcolor: '#4F46E5', height: 3, borderRadius: '3px 3px 0 0' }
                    }}>
                    <Tab icon={<PersonIcon />} iconPosition="start" label="Thông tin cá nhân" />
                    <Tab icon={<GradeIcon />} iconPosition="start" label={`Điểm số & GPA (${grades.length} môn)`} />
                    <Tab icon={<AttendanceIcon />} iconPosition="start" label={`Điểm danh (${attendance.length} buổi)`} />
                    <Tab icon={<NoteIcon />} iconPosition="start" label={`Ghi chú (${notes.length})`} />
                </Tabs>

                <Box sx={{ p: 4 }}>
                    {/* Tab 0: Profile */}
                    {activeTab === 0 && (
                        <Grid container spacing={3}>
                            {[
                                { label: 'Họ và tên', value: student.name },
                                { label: 'Giới tính', value: student.gender || 'Nam' },
                                { label: 'Ngày sinh', value: student.dateOfBirth || 'Chưa cập nhật' },
                                { label: 'Email', value: student.email },
                                { label: 'Số điện thoại', value: student.phone || 'Chưa cập nhật' },
                                { label: 'Lớp sinh hoạt', value: student.classCode },
                                { label: 'Khóa học', value: student.academicYear || '2023-2027' },
                                { label: 'Ngành học', value: student.major || 'Kỹ thuật phần mềm' },
                                { label: 'Khoa', value: student.department || 'Công nghệ thông tin' },
                                { label: 'Trạng thái', value: student.status || 'Đang học' }
                            ].map(({ label, value }) => (
                                <Grid item xs={12} sm={6} key={label}>
                                    <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: 3 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
                                        <Typography variant="body1" fontWeight={600} mt={0.5}>{value}</Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Tab 1: Grades */}
                    {activeTab === 1 && (
                        <Box>
                            {/* Header Bar - Cố định layout tránh đè nút */}
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 2.5,
                                flexWrap: 'wrap',
                                gap: 2,
                                p: 2,
                                bgcolor: 'background.paper',
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        📊 Bảng Điểm Tổng Hợp & Chuyên Cần
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.82rem' }}>
                                        Theo dõi điểm số học tập, chuyên cần (tối đa 15 buổi học hằng ngày) và điều kiện dự thi của sinh viên
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
                                    <Button
                                        variant="outlined"
                                        startIcon={syncingAttendance ? <CircularProgress size={16} /> : <SyncIcon />}
                                        onClick={handleSyncAttendance}
                                        disabled={syncingAttendance}
                                        sx={{
                                            borderColor: '#2563eb',
                                            color: '#2563eb',
                                            borderRadius: 2,
                                            px: 2,
                                            py: 1,
                                            fontWeight: 700,
                                            textTransform: 'none',
                                            fontSize: '0.82rem',
                                            '&:hover': { bgcolor: alpha('#2563eb', 0.08), borderColor: '#1d4ed8' }
                                        }}
                                    >
                                        {syncingAttendance ? 'Đang đồng bộ...' : 'Đồng bộ điểm danh'}
                                    </Button>

                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={handleOpenAddGrade}
                                        sx={{
                                            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                                            boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                                            borderRadius: 2,
                                            px: 2.5,
                                            py: 1,
                                            fontWeight: 700,
                                            textTransform: 'none',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Nhập điểm môn học
                                    </Button>
                                </Stack>
                            </Box>

                            {/* Table Container - Gọn gàng, không bị dàn trải 16 cột rộng */}
                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.04) }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>Mã môn</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 140 }}>Tên môn học</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>Tín chỉ</TableCell>
                                            
                                            {/* Cột Điểm Chuyên Cần Gọn Gàng & Thông Minh */}
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 175 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <span>Chuyên cần (10%)</span>
                                                    <Tooltip title="Điểm danh tối đa 15 buổi học trong kỳ. Nhấp vào để xem chi tiết từng buổi." arrow>
                                                        <i className="fa-solid fa-circle-info" style={{ color: '#2563eb', fontSize: '11px', cursor: 'pointer' }}></i>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>

                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 110 }}>Giữa kỳ (30%)</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 110 }}>Cuối kỳ (60%)</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>Điểm TK10</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>Học kỳ</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>Xếp loại</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, minWidth: 120 }}>Trạng thái</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {grades.map(g => {
                                            const attendedCount = getAttendedCount(g);
                                            const isEligible = attendedCount >= 11; // Vắng <= 4 buổi (<= 30%)
                                            return (
                                                <TableRow key={g._id} hover>
                                                    <TableCell><Typography fontWeight={700} fontSize="0.8rem" color="primary.main" fontFamily="monospace">{g.course?.code}</Typography></TableCell>
                                                    <TableCell><Typography fontSize="0.85rem" fontWeight={600}>{g.course?.name}</Typography></TableCell>
                                                    <TableCell align="center"><Chip label={g.course?.credits} size="small" color="primary" variant="outlined" /></TableCell>
                                                    
                                                    {/* Cột Chuyên Cần 10%: Gọn gàng, hiện điểm + số buổi có mặt / 15 buổi + 15 vạch nhỏ */}
                                                    <TableCell sx={{ minWidth: 175 }}>
                                                        <Tooltip title="Nhấn để xem bảng chi tiết 15 buổi điểm danh hằng ngày" arrow>
                                                            <Box
                                                                onClick={() => setViewingAttendanceGrade(g)}
                                                                sx={{
                                                                    cursor: 'pointer',
                                                                    p: 0.8,
                                                                    borderRadius: 2,
                                                                    border: '1px solid rgba(0,0,0,0.06)',
                                                                    bgcolor: 'action.hover',
                                                                    transition: 'all 0.15s ease',
                                                                    '&:hover': { bgcolor: alpha('#2563eb', 0.08), borderColor: alpha('#2563eb', 0.3), transform: 'translateY(-1px)' }
                                                                }}
                                                            >
                                                                {/* Hàng 1: Điểm số + Chip số buổi có mặt / 15 buổi */}
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4 }}>
                                                                        <Typography fontWeight={800} fontSize="0.92rem" sx={{
                                                                            color: g.attendanceScore >= 8 ? '#059669' : g.attendanceScore >= 5 ? '#d97706' : '#dc2626'
                                                                        }}>
                                                                            {g.attendanceScore}
                                                                        </Typography>
                                                                        <Typography fontSize="0.7rem" color="text.secondary" fontWeight={600}>/ 10</Typography>
                                                                    </Box>

                                                                    <Chip
                                                                        size="small"
                                                                        label={`${attendedCount}/15 buổi`}
                                                                        sx={{
                                                                            height: 20,
                                                                            fontSize: '0.68rem',
                                                                            fontWeight: 700,
                                                                            cursor: 'pointer',
                                                                            bgcolor: isEligible ? '#ecfdf5' : '#fef2f2',
                                                                            color: isEligible ? '#059669' : '#dc2626',
                                                                            border: '1px solid',
                                                                            borderColor: isEligible ? '#a7f3d0' : '#fecaca'
                                                                        }}
                                                                    />
                                                                </Box>

                                                                {/* Hàng 2: 15 vạch nhỏ gọn gàng biểu diễn 15 buổi */}
                                                                <Box sx={{ display: 'flex', gap: '2.5px', alignItems: 'center' }}>
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(sNum => {
                                                                        const info = getSessionAttendance(g, sNum);
                                                                        const isGood = info.status === 'good';
                                                                        const isWarn = info.status === 'warning';
                                                                        const dotColor = isGood ? '#10b981' : isWarn ? '#f59e0b' : '#ef4444';
                                                                        return (
                                                                            <Box
                                                                                key={sNum}
                                                                                sx={{
                                                                                    flex: 1,
                                                                                    height: 4,
                                                                                    borderRadius: '2px',
                                                                                    bgcolor: dotColor,
                                                                                    transition: 'height 0.15s',
                                                                                    '&:hover': { height: 7 }
                                                                                }}
                                                                            />
                                                                        );
                                                                    })}
                                                                </Box>
                                                            </Box>
                                                        </Tooltip>
                                                    </TableCell>

                                                    <TableCell><ScoreDisplay value={g.midtermScore} /></TableCell>
                                                    <TableCell><ScoreDisplay value={g.finalScore} /></TableCell>
                                                    <TableCell align="center">
                                                        <Typography fontWeight={800} fontSize="1rem" sx={{ color: GRADE_COLORS[g.letterGrade] || '#374151' }}>{g.totalScore10}</Typography>
                                                    </TableCell>
                                                    <TableCell><Typography fontSize="0.8rem" color="text.secondary">{g.semester}</Typography></TableCell>
                                                    <TableCell align="center">
                                                        <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 2, fontWeight: 800, fontSize: '0.8rem', bgcolor: alpha(GRADE_COLORS[g.letterGrade] || '#374151', 0.1), color: GRADE_COLORS[g.letterGrade] || '#374151' }}>
                                                            {g.letterGrade}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Tooltip title="Điểm đã được lưu vào hệ thống và khóa cố định theo quy chế đào tạo, không thể chỉnh sửa hoặc xóa">
                                                            <Chip
                                                                size="small"
                                                                icon={<LockIcon sx={{ fontSize: '13px !important' }} />}
                                                                label="Đã khóa điểm"
                                                                sx={{
                                                                    bgcolor: '#f1f5f9',
                                                                    color: '#475569',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.72rem',
                                                                    border: '1px solid #cbd5e1'
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {grades.length === 0 && (
                                            <TableRow><TableCell colSpan={10} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Chưa có dữ liệu điểm số. Nhấn "Nhập điểm môn học" để bắt đầu.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {/* Tab 2: Attendance */}
                    {activeTab === 2 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={3}>📅 Lịch sử điểm danh</Typography>
                            {attendance.length === 0 ? (
                                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 3 }}>
                                    <Typography color="text.secondary">Chưa có dữ liệu điểm danh.</Typography>
                                </Paper>
                            ) : (
                                <Grid container spacing={2}>
                                    {attendance.map(att => {
                                        const record = att.records.find(r => String(r.student) === id || String(r.student?._id) === id);
                                        const statusIcon = record?.status === 'present' ? <CheckCircle sx={{ color: '#059669' }} /> :
                                            record?.status === 'late' ? <AccessTime sx={{ color: '#D97706' }} /> : <Cancel sx={{ color: '#DC2626' }} />;
                                        const statusLabel = { present: 'Có mặt', late: 'Đi muộn', excused_absent: 'Nghỉ phép', unexcused_absent: 'Nghỉ không phép' };
                                        return (
                                            <Grid item xs={12} sm={6} md={4} key={att._id}>
                                                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
                                                    <CardContent>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Box>
                                                                <Typography fontWeight={700}>Buổi {att.sessionNumber}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{att.date}</Typography>
                                                            </Box>
                                                            {statusIcon}
                                                        </Stack>
                                                        {record && <Typography mt={1} fontSize="0.8rem" fontWeight={600} color={record.status === 'present' ? '#059669' : record.status === 'late' ? '#D97706' : '#DC2626'}>
                                                            {statusLabel[record.status] || record.status}
                                                        </Typography>}
                                                        {record?.note && <Typography mt={0.5} fontSize="0.78rem" color="text.secondary" fontStyle="italic">"{record.note}"</Typography>}
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            )}
                        </Box>
                    )}

                    {/* Tab 3: Notes */}
                    {activeTab === 3 && (
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>🔒 Ghi chú riêng tư</Typography>
                                    <Typography variant="caption" color="text.secondary">Chỉ bạn (giảng viên đang đăng nhập) mới thấy những ghi chú này</Typography>
                                </Box>
                                <Button variant="contained" startIcon={<AddIcon />}
                                    onClick={() => { setNoteContent(''); setEditingNoteId(null); setOpenNoteDialog(true); }}
                                    sx={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 14px rgba(79,70,229,0.4)' }}>
                                    Thêm ghi chú
                                </Button>
                            </Stack>
                            <Grid container spacing={2}>
                                {notes.map(note => (
                                    <Grid item xs={12} md={6} key={note._id}>
                                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: '#fffbeb', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                                            <CardContent>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                    <Typography variant="caption" color="text.secondary">
                                                        📅 {new Date(note.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </Typography>
                                                    <Stack direction="row">
                                                        <IconButton size="small" onClick={() => { setNoteContent(note.content); setEditingNoteId(note._id); setOpenNoteDialog(true); }} sx={{ color: '#D97706' }}><EditIcon fontSize="small" /></IconButton>
                                                        <IconButton size="small" onClick={() => setDeleteNoteConfirm(note)} sx={{ color: '#DC2626' }}><DeleteIcon fontSize="small" /></IconButton>
                                                    </Stack>
                                                </Stack>
                                                <Typography mt={1} variant="body2" lineHeight={1.7}>{note.content}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                                {notes.length === 0 && (
                                    <Grid item xs={12}>
                                        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 3 }}>
                                            <Typography color="text.secondary">Chưa có ghi chú nào. Bắt đầu ghi chú về sinh viên này!</Typography>
                                        </Paper>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* === GRADE DIALOG === */}
            <Dialog open={openGradeDialog} onClose={() => setOpenGradeDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <Box component="form" onSubmit={handleSaveGrade}>
                    <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {editingGrade ? '✏️ Chỉnh sửa điểm môn học' : '📝 Nhập điểm môn học mới'}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {gradeAlert && <Alert severity={gradeAlert.type} sx={{ mb: 2 }}>{gradeAlert.msg}</Alert>}

                        {/* Step 1: Chọn lớp học phần (tự động điền môn) */}
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Bước 1: Chọn lớp học phần
                        </Typography>
                        <TextField
                            select fullWidth size="small" required sx={{ mt: 1, mb: 3 }}
                            label="Lớp học phần *"
                            value={gradeForm.classSection}
                            onChange={(e) => handleSectionChange(e.target.value)}
                            helperText={classSections.length === 0 ? '⚠️ Không tìm thấy lớp học phần. Kiểm tra lại dữ liệu seed.' : `Tổng ${classSections.length} lớp học phần`}
                        >
                            {classSections.map(sec => {
                                const isAlreadyGraded = (studentData?.grades || []).some(
                                    g => String(g.classSection?._id || g.classSection) === String(sec._id)
                                );
                                return (
                                    <MenuItem key={sec._id} value={sec._id} disabled={isAlreadyGraded}>
                                        <Box>
                                            <Typography fontWeight={600} fontSize="0.9rem">
                                                {sec.sectionCode} {isAlreadyGraded && <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}>(Đã nhập điểm - Đã khóa)</span>}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">{sec.course?.name} ({sec.course?.credits} TC)</Typography>
                                        </Box>
                                    </MenuItem>
                                );
                            })}
                        </TextField>

                        {/* Bước 2: Quản lý Điểm chuyên cần (Tối đa 15 buổi học hằng ngày) */}
                        <Box sx={{ mt: 2, mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Bước 2: Điểm chuyên cần (Tối đa 15 buổi điểm danh hằng ngày)
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                    * Vắng 1 buổi trừ 6.67% • Vắng &gt; 30% (từ 5 buổi) bị cấm thi
                                </Typography>
                            </Box>

                            <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                                {/* Phím chọn nhanh thông minh (Presets) */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography fontSize="0.78rem" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                        ⚡ Chọn nhanh mẫu chuyên cần:
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        <Chip
                                            label="✓ Đủ 15 buổi có mặt (100%)"
                                            size="small"
                                            onClick={() => {
                                                const all10 = Array(15).fill(10);
                                                setGradeForm(prev => ({ ...prev, sessionScores: all10, attendanceScore: 10 }));
                                            }}
                                            sx={{
                                                bgcolor: '#ecfdf5', color: '#059669', fontWeight: 700,
                                                border: '1px solid #a7f3d0', cursor: 'pointer',
                                                '&:hover': { bgcolor: '#d1fae5' }
                                            }}
                                        />
                                        <Chip
                                            label="Vắng 1 buổi (93.3%)"
                                            size="small"
                                            onClick={() => {
                                                const scores = Array(15).fill(10);
                                                scores[0] = 0;
                                                setGradeForm(prev => ({ ...prev, sessionScores: scores, attendanceScore: 9.3 }));
                                            }}
                                            sx={{
                                                bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 600,
                                                border: '1px solid #bbf7d0', cursor: 'pointer',
                                                '&:hover': { bgcolor: '#dcfce7' }
                                            }}
                                        />
                                        <Chip
                                            label="Vắng 2 buổi (86.7%)"
                                            size="small"
                                            onClick={() => {
                                                const scores = Array(15).fill(10);
                                                scores[0] = 0; scores[1] = 0;
                                                setGradeForm(prev => ({ ...prev, sessionScores: scores, attendanceScore: 8.7 }));
                                            }}
                                            sx={{
                                                bgcolor: '#fffbeb', color: '#d97706', fontWeight: 600,
                                                border: '1px solid #fde68a', cursor: 'pointer',
                                                '&:hover': { bgcolor: '#fef3c7' }
                                            }}
                                        />
                                        <Chip
                                            label="Vắng 3 buổi (80.0%)"
                                            size="small"
                                            onClick={() => {
                                                const scores = Array(15).fill(10);
                                                scores[0] = 0; scores[1] = 0; scores[2] = 0;
                                                setGradeForm(prev => ({ ...prev, sessionScores: scores, attendanceScore: 8.0 }));
                                            }}
                                            sx={{
                                                bgcolor: '#fff7ed', color: '#ea580c', fontWeight: 600,
                                                border: '1px solid #fed7aa', cursor: 'pointer',
                                                '&:hover': { bgcolor: '#ffedd5' }
                                            }}
                                        />
                                        <Chip
                                            label="⚠️ Vắng 5 buổi (66.7% - Cấm thi)"
                                            size="small"
                                            onClick={() => {
                                                const scores = Array(15).fill(10);
                                                for (let i = 0; i < 5; i++) scores[i] = 0;
                                                setGradeForm(prev => ({ ...prev, sessionScores: scores, attendanceScore: 6.7 }));
                                            }}
                                            sx={{
                                                bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700,
                                                border: '1px solid #fecaca', cursor: 'pointer',
                                                '&:hover': { bgcolor: '#fee2e2' }
                                            }}
                                        />
                                    </Stack>
                                </Box>

                                {/* Ma trận 15 buổi dạng ô tương tác 5x3 */}
                                <Typography fontSize="0.78rem" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                    📅 Bấm trực tiếp vào buổi học để đổi trạng thái: Có mặt (100%) ➔ Đi muộn (50%) ➔ Vắng (0%)
                                </Typography>
                                <Grid container spacing={1}>
                                    {(gradeForm.sessionScores || Array(15).fill(10)).map((sc, idx) => {
                                        const isPresent = sc >= 8;
                                        const isLate = sc >= 5 && sc < 8;
                                        const isAbsent = sc < 5;
                                        const statusColor = isPresent ? '#059669' : isLate ? '#d97706' : '#dc2626';
                                        const statusBg = isPresent ? '#ecfdf5' : isLate ? '#fffbeb' : '#fef2f2';
                                        const statusBorder = isPresent ? '#a7f3d0' : isLate ? '#fde68a' : '#fecaca';
                                        const statusLabel = isPresent ? 'Có mặt' : isLate ? 'Muộn' : 'Vắng';
                                        const sessionPct = sc === 10 ? '100%' : sc === 5 ? '50%' : '0%';

                                        return (
                                            <Grid item xs={2.4} key={idx}>
                                                <Tooltip title={`Buổi ${idx + 1}: ${statusLabel} (${sessionPct}) - Nhấn để chuyển trạng thái`} arrow>
                                                    <Box
                                                        onClick={() => {
                                                            // Chu trình chuyển đổi: 100% (10đ) -> 50% (5đ) -> 0% (0đ) -> 100% (10đ)
                                                            const nextVal = sc === 10 ? 5 : sc === 5 ? 0 : 10;
                                                            const newScores = [...(gradeForm.sessionScores || Array(15).fill(10))];
                                                            newScores[idx] = nextVal;
                                                            const avg = Number((newScores.reduce((a, b) => a + b, 0) / 15).toFixed(1));
                                                            setGradeForm(prev => ({
                                                                ...prev,
                                                                sessionScores: newScores,
                                                                attendanceScore: avg
                                                            }));
                                                        }}
                                                        sx={{
                                                            p: 0.8,
                                                            borderRadius: 2,
                                                            textAlign: 'center',
                                                            bgcolor: statusBg,
                                                            border: '1.5px solid',
                                                            borderColor: statusBorder,
                                                            cursor: 'pointer',
                                                            userSelect: 'none',
                                                            transition: 'all 0.15s ease',
                                                            '&:hover': {
                                                                transform: 'translateY(-2px)',
                                                                boxShadow: '0 3px 8px rgba(0,0,0,0.08)'
                                                            }
                                                        }}
                                                    >
                                                        <Typography fontSize="0.7rem" fontWeight={800} color={statusColor}>
                                                            Buổi {idx + 1}
                                                        </Typography>
                                                        <Typography fontSize="0.75rem" fontWeight={700} color={statusColor} sx={{ mt: 0.2 }}>
                                                            {statusLabel}
                                                        </Typography>
                                                        <Typography fontSize="0.68rem" fontWeight={700} sx={{ opacity: 0.85, color: statusColor }}>
                                                            {sessionPct}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>
                                            </Grid>
                                        );
                                    })}
                                </Grid>

                                {/* Thanh thống kê chuyên cần & Cảnh báo cấm thi */}
                                {(() => {
                                    const scores = gradeForm.sessionScores || Array(15).fill(10);
                                    const attended = scores.filter(s => Number(s) >= 5).length;
                                    const absent = 15 - attended;
                                    const absentPct = Number(((absent / 15) * 100).toFixed(1));
                                    const isBanned = absent >= 5;

                                    return (
                                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(0,0,0,0.12)' }}>
                                            {isBanned ? (
                                                <Alert severity="error" sx={{ mb: 2, py: 0.5, borderRadius: 2, fontWeight: 600 }}>
                                                    ⚠️ CẢNH BÁO CẤM THI: Sinh viên vắng {absent}/15 buổi ({absentPct}% &gt; 30%), không đủ điều kiện dự thi cuối kỳ!
                                                </Alert>
                                            ) : (
                                                <Alert severity="success" sx={{ mb: 2, py: 0.5, borderRadius: 2, fontWeight: 600 }}>
                                                    ✅ Đủ điều kiện thi: Có mặt {attended}/15 buổi (Vắng {absent} buổi = {absentPct}% ≤ 30%)
                                                </Alert>
                                            )}

                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                                                <Box>
                                                    <Typography fontSize="0.85rem" fontWeight={700} color="text.primary">
                                                        Điểm chuyên cần hệ 10: <span style={{ fontSize: '1.05rem', color: gradeForm.attendanceScore >= 8 ? '#059669' : gradeForm.attendanceScore >= 5 ? '#d97706' : '#dc2626' }}>{gradeForm.attendanceScore} / 10</span>
                                                    </Typography>
                                                    <Typography fontSize="0.75rem" color="text.secondary">
                                                        Tính theo trung bình 15 buổi học (10% tổng kết)
                                                    </Typography>
                                                </Box>

                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    label="Hiệu chỉnh điểm CC"
                                                    inputProps={{ min: 0, max: 10, step: 0.1, style: { width: 70, textAlign: 'center', fontWeight: 700 } }}
                                                    value={gradeForm.attendanceScore}
                                                    onChange={(e) => setGradeForm(prev => ({ ...prev, attendanceScore: Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                                                    sx={{ width: 155 }}
                                                />
                                            </Box>
                                        </Box>
                                    );
                                })()}
                            </Paper>
                        </Box>

                        {/* Bước 3: Điểm thi giữa kỳ & cuối kỳ */}
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Bước 3: Điểm thi giữa kỳ & cuối kỳ
                        </Typography>
                        <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth size="small" type="number"
                                        label="Giữa kỳ (30%)"
                                        inputProps={{ min: 0, max: 10, step: 0.1 }}
                                        value={gradeForm.midtermScore}
                                        onChange={(e) => setGradeForm({ ...gradeForm, midtermScore: parseFloat(e.target.value) || 0 })}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth size="small" type="number"
                                        label="Cuối kỳ (60%)"
                                        inputProps={{ min: 0, max: 10, step: 0.1 }}
                                        value={gradeForm.finalScore}
                                        onChange={(e) => setGradeForm({ ...gradeForm, finalScore: parseFloat(e.target.value) || 0 })}
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Preview điểm tổng kết */}
                        <Box sx={{ p: 2, borderRadius: 2, border: '2px solid', borderColor: previewTotal >= 5 ? '#10B981' : '#EF4444', bgcolor: alpha(previewTotal >= 5 ? '#10B981' : '#EF4444', 0.05) }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography fontWeight={600} fontSize="0.9rem">Điểm tổng kết dự kiến (hệ 10):</Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ color: previewTotal >= 5 ? '#059669' : '#DC2626' }}>
                                    {previewTotal}
                                </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Công thức: {gradeForm.attendanceScore}×10% + {gradeForm.midtermScore}×30% + {gradeForm.finalScore}×60% = {previewTotal} ({previewTotal >= 5 ? '✅ Đạt' : '❌ Rớt'})
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth size="small" label="Học kỳ" sx={{ mt: 2 }}
                            value={gradeForm.semester}
                            onChange={(e) => setGradeForm({ ...gradeForm, semester: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button onClick={() => setOpenGradeDialog(false)} color="inherit">Hủy</Button>
                        <Button type="submit" variant="contained" sx={{ px: 3 }}>
                            {editingGrade ? 'Lưu thay đổi' : 'Nhập điểm'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* === CHI TIẾT 15 BUỔI ĐIỂM DANH MODAL === */}
            <Dialog 
                open={Boolean(viewingAttendanceGrade)} 
                onClose={() => setViewingAttendanceGrade(null)} 
                maxWidth="md" 
                fullWidth 
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
                {viewingAttendanceGrade && (() => {
                    const g = viewingAttendanceGrade;
                    const attendedCount = getAttendedCount(g);
                    const absentCount = 15 - attendedCount;
                    const absentPct = Number(((absentCount / 15) * 100).toFixed(1));
                    const isEligible = attendedCount >= 11; // Vắng <= 4 buổi (<= 30%)

                    return (
                        <Box>
                            <DialogTitle sx={{ 
                                background: 'linear-gradient(135deg, #1e293b, #334155)', 
                                color: 'white', 
                                py: 2, px: 3,
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 1
                            }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        📅 Chi Tiết 15 Buổi Điểm Danh & Chuyên Cần
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.82rem' }}>
                                        Môn: <strong>{g.course?.name}</strong> ({g.course?.code}) • {g.course?.credits} Tín chỉ • {g.semester}
                                    </Typography>
                                </Box>
                                <Chip 
                                    label={isEligible ? '✅ ĐỦ ĐIỀU KIỆN DỰ THI' : '⚠️ CẤM THI (VẮNG > 30%)'}
                                    sx={{ 
                                        fontWeight: 800, 
                                        fontSize: '0.75rem',
                                        bgcolor: isEligible ? '#10b981' : '#ef4444', 
                                        color: 'white' 
                                    }} 
                                />
                            </DialogTitle>

                            <DialogContent sx={{ p: 3 }}>
                                {/* 4 Thẻ chỉ số tổng hợp */}
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6} sm={3}>
                                        <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                            <Typography fontSize="0.72rem" color="text.secondary" fontWeight={600}>QUY CHUẨN KỲ HỌC</Typography>
                                            <Typography variant="h6" fontWeight={800} color="#334155">15 Buổi</Typography>
                                            <Typography fontSize="0.7rem" color="text.secondary">Tối đa chuyên cần</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                            <Typography fontSize="0.72rem" color="#059669" fontWeight={700}>SỐ BUỔI CÓ MẶT</Typography>
                                            <Typography variant="h6" fontWeight={800} color="#059669">{attendedCount} / 15</Typography>
                                            <Typography fontSize="0.7rem" color="#059669" fontWeight={600}>{((attendedCount / 15) * 100).toFixed(0)}% tham gia</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: isEligible ? '#fffbeb' : '#fef2f2', border: '1px solid', borderColor: isEligible ? '#fde68a' : '#fecaca' }}>
                                            <Typography fontSize="0.72rem" color={isEligible ? '#d97706' : '#dc2626'} fontWeight={700}>SỐ BUỔI VẮNG</Typography>
                                            <Typography variant="h6" fontWeight={800} color={isEligible ? '#d97706' : '#dc2626'}>{absentCount} Buổi</Typography>
                                            <Typography fontSize="0.7rem" color={isEligible ? '#d97706' : '#dc2626'}>-{absentCount * 6.67}% CC</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                            <Typography fontSize="0.72rem" color="#2563eb" fontWeight={700}>ĐIỂM CHUYÊN CẦN</Typography>
                                            <Typography variant="h6" fontWeight={800} color="#2563eb">{g.attendanceScore} / 10</Typography>
                                            <Typography fontSize="0.7rem" color="#2563eb" fontWeight={600}>Trọng số 10%</Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                {/* Alert cảnh báo nếu vắng quá 30% */}
                                {!isEligible ? (
                                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>
                                        ⛔ <strong>QUY CHẾ THI:</strong> Sinh viên đã vắng <strong>{absentCount}/15 buổi ({absentPct}% &gt; 30%)</strong>. Theo quy chế đào tạo, sinh viên <strong>KHÔNG ĐỦ ĐIỀU KIỆN DỰ THI KẾT THÚC HỌC PHẦN</strong> môn này!
                                    </Alert>
                                ) : (
                                    <Alert severity="success" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>
                                        ✅ <strong>QUY CHẾ THI:</strong> Sinh viên duy trì tỷ lệ đi học đạt <strong>{((attendedCount / 15) * 100).toFixed(0)}%</strong> (chỉ vắng {absentCount} buổi, dưới ngưỡng 30%), <strong>ĐỦ ĐIỀU KIỆN DỰ THI CUỐI KỲ</strong>.
                                    </Alert>
                                )}

                                {/* Bảng 15 Buổi Chi Tiết (5 Cột x 3 Hàng) */}
                                <Typography fontSize="0.82rem" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5 }}>
                                    📋 Bảng Trạng Thái 15 Buổi Điểm Danh:
                                </Typography>
                                <Grid container spacing={1.5}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(sNum => {
                                        const info = getSessionAttendance(g, sNum);
                                        const isGood = info.status === 'good';
                                        const isWarn = info.status === 'warning';
                                        const cardBg = isGood ? '#ecfdf5' : isWarn ? '#fffbeb' : '#fef2f2';
                                        const cardBorder = isGood ? '#a7f3d0' : isWarn ? '#fde68a' : '#fecaca';
                                        const textColor = isGood ? '#059669' : isWarn ? '#d97706' : '#dc2626';
                                        const statusText = isGood ? 'Có mặt' : isWarn ? 'Đi muộn' : 'Vắng mặt';
                                        const sessionPct = info.score === 10 ? '100%' : info.score === 5 ? '50%' : info.score === 0 ? '0%' : (info.score !== undefined ? `${(info.score * 10).toFixed(0)}%` : '100%');

                                        return (
                                            <Grid item xs={4} sm={2.4} key={sNum}>
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        p: 1.2,
                                                        borderRadius: 2,
                                                        bgcolor: cardBg,
                                                        border: '1px solid',
                                                        borderColor: cardBorder,
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                        <Typography fontSize="0.7rem" fontWeight={800} color="text.secondary">
                                                            B{sNum}
                                                        </Typography>
                                                        <Chip
                                                            size="small"
                                                            label={sessionPct}
                                                            sx={{
                                                                height: 18,
                                                                fontSize: '0.62rem',
                                                                fontWeight: 800,
                                                                bgcolor: textColor,
                                                                color: 'white'
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography fontSize="0.75rem" fontWeight={700} color={textColor}>
                                                        {statusText}
                                                    </Typography>
                                                    <Typography fontSize="0.65rem" color="text.secondary" sx={{ mt: 0.2 }}>
                                                        {isGood ? 'Đầy đủ' : isWarn ? 'Trừ 3.33%' : '-6.67% CC'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </DialogContent>

                            <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LockIcon sx={{ fontSize: 18, color: '#475569' }} />
                                    <Typography fontSize="0.82rem" fontWeight={700} color="#475569">
                                        Điểm đã lưu & Khóa theo quy chế đào tạo
                                    </Typography>
                                </Box>
                                <Button 
                                    onClick={() => setViewingAttendanceGrade(null)} 
                                    variant="contained" 
                                    sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 700 }}
                                >
                                    Đóng
                                </Button>
                            </DialogActions>
                        </Box>
                    );
                })()}
            </Dialog>

            {/* === NOTE DIALOG === */}
            <Dialog open={openNoteDialog} onClose={() => setOpenNoteDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <Box component="form" onSubmit={handleSaveNote}>
                    <DialogTitle sx={{ fontWeight: 700 }}>{editingNoteId ? '✏️ Sửa ghi chú' : '📝 Thêm ghi chú riêng tư'}</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth multiline rows={5} sx={{ mt: 1 }}
                            label="Nội dung ghi chú" required
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Ghi nhận hành vi học tập, thành tích nổi bật, vấn đề cần theo dõi..."
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenNoteDialog(false)} color="inherit">Hủy</Button>
                        <Button type="submit" variant="contained">Lưu ghi chú</Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* === DELETE GRADE CONFIRM === */}
            <Dialog open={!!deleteGradeConfirm} onClose={() => setDeleteGradeConfirm(null)} maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle fontWeight={700}>⚠️ Xóa điểm môn học</DialogTitle>
                <DialogContent><Typography>Xóa điểm môn <strong>{deleteGradeConfirm?.course?.name}</strong>? Hành động này sẽ ảnh hưởng đến GPA của sinh viên.</Typography></DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteGradeConfirm(null)} color="inherit">Hủy</Button>
                    <Button onClick={handleDeleteGrade} color="error" variant="contained">Xóa điểm</Button>
                </DialogActions>
            </Dialog>

            {/* === DELETE NOTE CONFIRM === */}
            <Dialog open={!!deleteNoteConfirm} onClose={() => setDeleteNoteConfirm(null)} maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle fontWeight={700}>⚠️ Xóa ghi chú</DialogTitle>
                <DialogContent><Typography>Bạn có chắc muốn xóa ghi chú này không?</Typography></DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteNoteConfirm(null)} color="inherit">Hủy</Button>
                    <Button onClick={handleDeleteNote} color="error" variant="contained">Xóa</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default StudentDetail;
