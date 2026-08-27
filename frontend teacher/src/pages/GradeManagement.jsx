import { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Paper, Grid, MenuItem, TextField, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
    Stack, Alert, Snackbar, Tooltip, IconButton, alpha, Dialog, DialogTitle,
    DialogContent, DialogActions, LinearProgress, Badge, CircularProgress, Fade
} from '@mui/material';
import {
    Lock as LockIcon, LockOpen as UnlockIcon, Publish as PublishIcon,
    School as SchoolIcon, Edit as EditIcon, Save as SaveIcon,
    Analytics as AnalyticsIcon, EmojiEvents as TrophyIcon,
    CheckCircle, Cancel
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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
    const [classSections, setClassSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [grades, setGrades] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [editRow, setEditRow] = useState(null); // { gradeId, attendanceScore, midtermScore, finalScore, teacherComment }
    const [snack, setSnack] = useState(null);
    const [publishDialog, setPublishDialog] = useState(null); // 'publish' | 'lock' | null
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchClassSections(); }, []);
    useEffect(() => { if (selectedSection) fetchGrades(); }, [selectedSection]);

    const fetchClassSections = async () => {
        try {
            const res = await axios.get('/academic/class-sections');
            if (res.data.success) {
                setClassSections(res.data.data);
                if (res.data.data.length > 0) setSelectedSection(res.data.data[0]._id);
            }
        } catch (err) { console.error(err); }
    };

    const fetchGrades = useCallback(async () => {
        if (!selectedSection) return;
        setLoading(true);
        try {
            const res = await axios.get(`/teacher/class-grades/${selectedSection}`);
            if (res.data.success) { setGrades(res.data.data); setStats(res.data.stats); }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [selectedSection]);

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

    const handlePublish = async () => {
        setSaving(true);
        try {
            const res = await axios.post('/teacher/grades/publish', { classSectionId: selectedSection });
            setPublishDialog(null);
            fetchGrades();
            setSnack({ severity: 'success', msg: `✅ ${res.data.message}` });
        } catch (err) {
            setSnack({ severity: 'error', msg: 'Lỗi khi công bố điểm' });
        } finally { setSaving(false); }
    };

    const handleLock = async () => {
        setSaving(true);
        try {
            const res = await axios.post('/teacher/grades/lock', { classSectionId: selectedSection });
            setPublishDialog(null);
            fetchGrades();
            setSnack({ severity: 'success', msg: `🔒 ${res.data.message}` });
        } catch (err) {
            setSnack({ severity: 'error', msg: 'Lỗi khi khóa điểm' });
        } finally { setSaving(false); }
    };

    // Preview score for edit row
    const previewScore = editRow
        ? +(editRow.attendanceScore * 0.1 + editRow.midtermScore * 0.3 + editRow.finalScore * 0.6).toFixed(2)
        : null;

    const currentSection = classSections.find(s => s._id === selectedSection);

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
                        <Typography sx={{ opacity: 0.8 }}>Nhập, sửa, công bố và khóa điểm theo từng lớp học phần</Typography>
                    </Box>
                    <Stack direction="row" gap={2} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<AnalyticsIcon />}
                            onClick={() => navigate(`/analytics/${selectedSection}`)}
                            sx={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                        >
                            Xem thống kê
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<PublishIcon />}
                            onClick={() => setPublishDialog('publish')}
                            disabled={grades.length === 0}
                            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                        >
                            Công bố điểm
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<LockIcon />}
                            onClick={() => setPublishDialog('lock')}
                            disabled={grades.length === 0}
                            sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }}
                        >
                            Khóa điểm
                        </Button>
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

            {/* Grade Table */}
            {loading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
            ) : (
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.05) }}>
                                    {['Mã SV', 'Họ tên', 'Chuyên cần (10%)', 'Giữa kỳ (30%)', 'Cuối kỳ (60%)', 'Điểm TK', 'Xếp loại', 'Nhận xét', 'TT', 'Thao tác'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {grades.map((g) => {
                                    const isEditing = editRow?.gradeId === g._id;
                                    const lc = LETTER_COLORS[g.letterGrade] || {};
                                    return (
                                        <Fade in key={g._id} timeout={200}>
                                            <TableRow hover sx={{ bgcolor: isEditing ? alpha('#4F46E5', 0.04) : 'transparent', '&:hover': { bgcolor: alpha('#4F46E5', 0.03) } }}>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4F46E5', fontSize: '0.8rem' }}>{g.student?.code}</TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', minWidth: 140 }}>{g.student?.name}</TableCell>

                                                {/* Score cells */}
                                                {['attendanceScore', 'midtermScore', 'finalScore'].map(field => (
                                                    <TableCell key={field}>
                                                        {isEditing ? (
                                                            <TextField
                                                                type="number" size="small" variant="outlined"
                                                                inputProps={{ min: 0, max: 10, step: 0.1, style: { textAlign: 'center', padding: '4px 8px' } }}
                                                                sx={{ width: 80 }}
                                                                value={editRow[field]}
                                                                onChange={(e) => setEditRow({ ...editRow, [field]: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        ) : (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography fontWeight={700} fontSize="0.9rem">{g[field]}</Typography>
                                                                <LinearProgress variant="determinate" value={g[field] * 10}
                                                                    sx={{ flex: 1, height: 4, borderRadius: 2, minWidth: 40,
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

                                                <TableCell>
                                                    {g.isLocked ? (
                                                        <Typography fontSize="0.75rem" color="error.main" fontWeight={600}>🔒 Đã khóa</Typography>
                                                    ) : isEditing ? (
                                                        <Stack direction="row" gap={0.5}>
                                                            <IconButton size="small" color="success" onClick={handleEditSave} disabled={saving}>
                                                                {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                                                            </IconButton>
                                                            <IconButton size="small" color="default" onClick={() => setEditRow(null)}>
                                                                <Cancel fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                    ) : (
                                                        <Tooltip title="Chỉnh sửa điểm">
                                                            <IconButton size="small" onClick={() => handleEditStart(g)}
                                                                sx={{ color: '#D97706', bgcolor: alpha('#D97706', 0.08), '&:hover': { bgcolor: alpha('#D97706', 0.18) } }}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </Fade>
                                    );
                                })}
                                {grades.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
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

            {/* Publish/Lock Dialog */}
            <Dialog open={!!publishDialog} onClose={() => setPublishDialog(null)} maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle fontWeight={700}>
                    {publishDialog === 'publish' ? '📢 Công bố điểm' : '🔒 Khóa điểm'}
                </DialogTitle>
                <DialogContent>
                    {publishDialog === 'publish' ? (
                        <Typography>Bạn có chắc muốn <strong>công bố điểm</strong> cho toàn bộ sinh viên trong lớp này? Sinh viên sẽ nhận được thông báo và có thể xem điểm ngay lập tức.</Typography>
                    ) : (
                        <Alert severity="warning" sx={{ mb: 0 }}>
                            <Typography><strong>Hành động này không thể hoàn tác!</strong> Sau khi khóa điểm, giảng viên sẽ không thể sửa điểm của các sinh viên trong lớp này nữa. Đồng thời điểm sẽ tự động được công bố tới sinh viên.</Typography>
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPublishDialog(null)} color="inherit">Hủy</Button>
                    <Button
                        variant="contained"
                        color={publishDialog === 'lock' ? 'error' : 'success'}
                        onClick={publishDialog === 'lock' ? handleLock : handlePublish}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : (publishDialog === 'lock' ? <LockIcon /> : <PublishIcon />)}
                    >
                        {saving ? 'Đang xử lý...' : (publishDialog === 'lock' ? 'Khóa điểm' : 'Công bố điểm')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack?.severity} onClose={() => setSnack(null)} sx={{ borderRadius: 2 }}>
                    {snack?.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default GradeManagement;
