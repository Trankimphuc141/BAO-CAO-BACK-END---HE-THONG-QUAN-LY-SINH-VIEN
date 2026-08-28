import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Paper, Grid, TextField, MenuItem, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Stack,
    Chip, Alert, Card, CardContent, alpha, CircularProgress, Fade, Avatar
} from '@mui/material';
import {
    Save as SaveIcon, CheckCircle, Cancel, AccessTime, HowToReg as AttIcon
} from '@mui/icons-material';

const STATUS_OPTIONS = [
    { value: 'present', label: '✅ Có mặt', color: '#059669', bg: '#ecfdf5' },
    { value: 'late', label: '⏰ Đi muộn', color: '#D97706', bg: '#fffbeb' },
    { value: 'excused_absent', label: '📋 Nghỉ phép', color: '#2563EB', bg: '#eff6ff' },
    { value: 'unexcused_absent', label: '❌ Nghỉ K/P', color: '#DC2626', bg: '#fef2f2' },
];

function AttendanceMark() {
    const [classSections, setClassSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [sectionInfo, setSectionInfo] = useState(null);
    const [sessionNumber, setSessionNumber] = useState(1);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState({});
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => { fetchClassSections(); }, []);

    const fetchClassSections = async () => {
        try {
            const res = await axios.get('/academic/class-sections');
            if (res.data.success && res.data.data.length > 0) {
                setClassSections(res.data.data);
                const first = res.data.data[0];
                setSelectedSection(first._id);
                setSectionInfo(first);
                initStudents(first.students || []);
            }
        } catch (err) { console.error(err); }
    };

    const initStudents = (list) => {
        setStudents(list);
        const init = {};
        list.forEach(s => { init[s._id] = { status: 'present', note: '' }; });
        setRecords(init);
    };

    const handleSectionChange = (id) => {
        const sec = classSections.find(s => s._id === id);
        setSelectedSection(id);
        setSectionInfo(sec);
        initStudents(sec?.students || []);
        setAlert(null);
    };

    const setStatus = (studentId, status) => setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
    const setNote = (studentId, note) => setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));

    const countByStatus = (status) => Object.values(records).filter(r => r.status === status).length;

    const handleSave = async () => {
        if (!selectedSection) { setAlert({ type: 'error', msg: 'Vui lòng chọn lớp học phần.' }); return; }
        try {
            setSaving(true);
            setAlert(null);
            const recordsBody = Object.keys(records).map(studentId => ({
                student: studentId,
                status: records[studentId].status,
                note: records[studentId].note
            }));
            const res = await axios.post('/academic/attendance', {
                classSectionId: selectedSection,
                sessionNumber,
                date,
                records: recordsBody
            });
            if (res.data.success) {
                setAlert({ type: 'success', msg: `✅ ${res.data.message}` });
            }
        } catch (err) {
            setAlert({ type: 'error', msg: err.response?.data?.message || 'Có lỗi xảy ra khi lưu điểm danh.' });
        } finally {
            setSaving(false);
        }
    };

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
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.85 }}>
                    Ghi nhận sự hiện diện của sinh viên cho từng buổi học theo lớp học phần
                </Typography>
            </Box>

            {alert && (
                <Alert severity={alert.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}

            {/* Controls */}
            <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>⚙️ Cấu hình buổi điểm danh</Typography>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} sm={5}>
                        <TextField select fullWidth label="Lớp học phần" value={selectedSection} onChange={(e) => handleSectionChange(e.target.value)}
                            helperText={sectionInfo ? `${sectionInfo.course?.name} — Phòng: ${sectionInfo.room}` : ''}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                            {classSections.map(sec => (
                                <MenuItem key={sec._id} value={sec._id}>
                                    <Box>
                                        <Typography fontWeight={600}>{sec.sectionCode}</Typography>
                                        <Typography variant="caption" color="text.secondary">{sec.course?.name}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField type="number" fullWidth label="Buổi học số" value={sessionNumber}
                            inputProps={{ min: 1, max: 15 }}
                            onChange={(e) => setSessionNumber(parseInt(e.target.value) || 1)}
                            helperText={`Tối đa ${sectionInfo?.totalLessons || 15} buổi`}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block', ml: 0.5 }}>
                                Ngày điểm danh
                            </Typography>
                            <TextField type="date" fullWidth value={date}
                                onChange={(e) => setDate(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Stats */}
            {students.length > 0 && (
                <Grid container spacing={2} mb={3}>
                    {[
                        { label: 'Tổng số', value: students.length, color: '#4F46E5', icon: '👥' },
                        { label: 'Có mặt', value: countByStatus('present'), color: '#059669', icon: '✅' },
                        { label: 'Đi muộn', value: countByStatus('late'), color: '#D97706', icon: '⏰' },
                        { label: 'Vắng mặt', value: countByStatus('excused_absent') + countByStatus('unexcused_absent'), color: '#DC2626', icon: '❌' },
                    ].map(stat => (
                        <Grid item xs={6} sm={3} key={stat.label}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, textAlign: 'center', p: 2 }}>
                                <Typography fontSize="1.8rem">{stat.icon}</Typography>
                                <Typography variant="h4" fontWeight={800} sx={{ color: stat.color }}>{stat.value}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{stat.label}</Typography>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Attendance Table */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
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
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            {STATUS_OPTIONS.map(opt => (
                                                <TableCell key={opt.value} align="center">
                                                    <Box
                                                        onClick={() => setStatus(student._id, opt.value)}
                                                        sx={{
                                                            width: 32, height: 32, borderRadius: '50%', mx: 'auto', cursor: 'pointer',
                                                            border: '2px solid',
                                                            borderColor: records[student._id]?.status === opt.value ? opt.color : 'divider',
                                                            bgcolor: records[student._id]?.status === opt.value ? opt.bg : 'transparent',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.15s ease',
                                                            '&:hover': { borderColor: opt.color, bgcolor: opt.bg }
                                                        }}
                                                    >
                                                        {records[student._id]?.status === opt.value && (
                                                            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: opt.color }} />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <TextField
                                                    size="small" variant="standard" placeholder="Nhập ghi chú..."
                                                    value={records[student._id]?.note || ''}
                                                    onChange={(e) => setNote(student._id, e.target.value)}
                                                    sx={{
                                                        minWidth: 160,
                                                        '& .MuiInputBase-input': {
                                                            color: '#111827 !important',
                                                            fontSize: '0.82rem',
                                                            WebkitTextFillColor: '#111827',
                                                        },
                                                        '& .MuiInputBase-input::placeholder': {
                                                            color: '#6b7280',
                                                            opacity: 1,
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
                            {classSections.length === 0 ? 'Không có lớp học phần nào. Hãy chạy lệnh seed để tạo dữ liệu mẫu.' : 'Lớp học này chưa có sinh viên đăng ký.'}
                        </Typography>
                    </Box>
                )}
            </Paper>

            {students.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{
                            px: 5, py: 1.5,
                            background: 'linear-gradient(135deg, #059669, #10B981)',
                            boxShadow: '0 8px 24px rgba(5, 150, 105, 0.4)',
                            fontSize: '1rem', fontWeight: 700,
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(5, 150, 105, 0.5)' },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {saving ? 'Đang lưu...' : `Lưu điểm danh buổi ${sessionNumber}`}
                    </Button>
                </Box>
            )}
        </Box>
    );
}

export default AttendanceMark;
