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
    EmojiEvents as TrophyIcon
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
    const [gradeAlert, setGradeAlert] = useState(null);
    const [gradeForm, setGradeForm] = useState({
        classSection: '', course: '', semester: 'HK1-2026-2027',
        attendanceScore: 10, midtermScore: 0, finalScore: 0
    });

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
        const firstSec = classSections[0];
        setGradeForm({
            classSection: firstSec?._id || '',
            course: firstSec?.course?._id || firstSec?.course || '',
            semester: 'HK1-2026-2027',
            attendanceScore: 10, midtermScore: 0, finalScore: 0
        });
        setEditingGrade(null);
        setGradeAlert(null);
        setOpenGradeDialog(true);
    };

    const handleOpenEditGrade = (g) => {
        setGradeForm({
            classSection: g.classSection?._id || g.classSection || '',
            course: g.course?._id || g.course || '',
            semester: g.semester || 'HK1-2026-2027',
            attendanceScore: g.attendanceScore,
            midtermScore: g.midtermScore,
            finalScore: g.finalScore
        });
        setEditingGrade(g);
        setGradeAlert(null);
        setOpenGradeDialog(true);
    };

    const handleSaveGrade = async (e) => {
        e.preventDefault();
        try {
            setGradeAlert(null);
            // Validate: classSection and course must be selected
            if (!gradeForm.classSection || !gradeForm.course) {
                setGradeAlert({ type: 'error', msg: 'Vui lòng chọn lớp học phần để hệ thống tự động xác định môn học.' });
                return;
            }
            const payload = {
                classSection: gradeForm.classSection,
                course: gradeForm.course,
                semester: gradeForm.semester,
                attendanceScore: Number(gradeForm.attendanceScore),
                midtermScore: Number(gradeForm.midtermScore),
                finalScore: Number(gradeForm.finalScore)
            };
            if (editingGrade) {
                await axios.put(`/teacher/grades/${editingGrade._id}`, payload);
            } else {
                await axios.post(`/teacher/students/${id}/grades`, payload);
            }
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
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                                <Typography variant="h6" fontWeight={700}>📊 Bảng điểm tổng hợp</Typography>
                                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddGrade}
                                    sx={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 14px rgba(79,70,229,0.4)' }}>
                                    Nhập điểm môn học
                                </Button>
                            </Stack>
                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.04) }}>
                                            {['Mã môn', 'Tên môn học', 'Tín chỉ', 'Chuyên cần (10%)', 'Giữa kỳ (30%)', 'Cuối kỳ (60%)', 'Điểm TK10', 'Học kỳ', 'Xếp loại', ''].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5 }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {grades.map(g => (
                                            <TableRow key={g._id} hover>
                                                <TableCell><Typography fontWeight={700} fontSize="0.8rem" color="primary.main" fontFamily="monospace">{g.course?.code}</Typography></TableCell>
                                                <TableCell><Typography fontSize="0.85rem">{g.course?.name}</Typography></TableCell>
                                                <TableCell><Chip label={g.course?.credits} size="small" color="primary" variant="outlined" /></TableCell>
                                                <TableCell><ScoreDisplay value={g.attendanceScore} /></TableCell>
                                                <TableCell><ScoreDisplay value={g.midtermScore} /></TableCell>
                                                <TableCell><ScoreDisplay value={g.finalScore} /></TableCell>
                                                <TableCell>
                                                    <Typography fontWeight={800} fontSize="1rem" sx={{ color: GRADE_COLORS[g.letterGrade] || '#374151' }}>{g.totalScore10}</Typography>
                                                </TableCell>
                                                <TableCell><Typography fontSize="0.8rem" color="text.secondary">{g.semester}</Typography></TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 2, fontWeight: 800, fontSize: '0.8rem', bgcolor: alpha(GRADE_COLORS[g.letterGrade] || '#374151', 0.1), color: GRADE_COLORS[g.letterGrade] || '#374151' }}>
                                                        {g.letterGrade}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" gap={0.5}>
                                                        <Tooltip title="Chỉnh sửa điểm"><IconButton size="small" onClick={() => handleOpenEditGrade(g)} sx={{ color: '#D97706' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                                        <Tooltip title="Xóa điểm"><IconButton size="small" onClick={() => setDeleteGradeConfirm(g)} sx={{ color: '#DC2626' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
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
            <Dialog open={openGradeDialog} onClose={() => setOpenGradeDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
                            {classSections.map(sec => (
                                <MenuItem key={sec._id} value={sec._id}>
                                    <Box>
                                        <Typography fontWeight={600} fontSize="0.9rem">{sec.sectionCode}</Typography>
                                        <Typography variant="caption" color="text.secondary">{sec.course?.name} ({sec.course?.credits} TC)</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>

                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Bước 2: Nhập điểm thành phần
                        </Typography>
                        <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <TextField
                                        fullWidth size="small" type="number"
                                        label="Chuyên cần (10%)"
                                        inputProps={{ min: 0, max: 10, step: 0.1 }}
                                        value={gradeForm.attendanceScore}
                                        onChange={(e) => setGradeForm({ ...gradeForm, attendanceScore: parseFloat(e.target.value) || 0 })}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        fullWidth size="small" type="number"
                                        label="Giữa kỳ (30%)"
                                        inputProps={{ min: 0, max: 10, step: 0.1 }}
                                        value={gradeForm.midtermScore}
                                        onChange={(e) => setGradeForm({ ...gradeForm, midtermScore: parseFloat(e.target.value) || 0 })}
                                    />
                                </Grid>
                                <Grid item xs={4}>
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
