import { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Grid, Card, CardContent, Stack, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions, TextField,
    Snackbar
} from '@mui/material';
import {
    CalendarMonth as CalendarIcon,
    Room as RoomIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Schedule as ScheduleIcon,
    Send as SendIcon
} from '@mui/icons-material';

const DAY_LABELS = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'Chủ Nhật'
};

export default function TeachingSchedule() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal reject / propose
    const [rejectTarget, setRejectTarget] = useState(null);
    const [proposalText, setProposalText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/academic-mgmt/teacher/my-schedule');
            if (res.data.success) {
                setSections(res.data.data || []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tải lịch giảng dạy');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    // Giảng viên Xác Nhận lịch dạy
    const handleAccept = async (sec) => {
        try {
            const res = await axios.put(`/academic-mgmt/sections/${sec._id}/teacher-response`, {
                status: 'accepted'
            });
            if (res.data.success) {
                setToast({
                    open: true,
                    msg: `Đã xác nhận lịch dạy lớp "${sec.sectionCode}". Lớp học đã được đẩy lên Cổng Sinh Viên!`,
                    severity: 'success'
                });
                fetchSchedule();
            }
        } catch (err) {
            setToast({
                open: true,
                msg: err.response?.data?.message || 'Lỗi khi xác nhận lịch dạy',
                severity: 'error'
            });
        }
    };

    // Giảng viên Từ Chối & Đề Xuất Lịch Mới
    const handleConfirmReject = async () => {
        if (!proposalText.trim()) {
            setToast({ open: true, msg: 'Vui lòng nhập lý do hoặc đề xuất thời gian mới', severity: 'warning' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.put(`/academic-mgmt/sections/${rejectTarget._id}/teacher-response`, {
                status: 'rejected',
                feedback: proposalText.trim()
            });

            if (res.data.success) {
                setToast({
                    open: true,
                    msg: `Đã từ chối và gửi đề xuất thời gian dạy về cho Phòng Đào Tạo!`,
                    severity: 'info'
                });
                setRejectTarget(null);
                setProposalText('');
                fetchSchedule();
            }
        } catch (err) {
            setToast({
                open: true,
                msg: err.response?.data?.message || 'Lỗi gửi đề xuất',
                severity: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const totalCredits = sections.reduce((sum, s) => sum + (s.course?.credits || 0), 0);
    const totalStudents = sections.reduce((sum, s) => sum + (s.students?.length || 0), 0);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
                borderRadius: 4, p: { xs: 2.5, sm: 3.5 }, mb: 3, color: 'white',
                boxShadow: '0 8px 32px rgba(67, 56, 202, 0.25)'
            }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{
                        p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CalendarIcon sx={{ fontSize: 36, color: '#a5b4fc' }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" fontWeight={800}>
                            Lịch Giảng Dạy & Xác Thực Phân Công
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                            Giảng viên vui lòng kiểm tra và bấm "Xác Nhận" để đẩy lớp học lên Cổng Sinh Viên, hoặc "Từ Chối" để đề xuất thời gian dạy mới cho Admin.
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            {/* Stats Overview */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                                Tổng Số Lớp Phụ Trách
                            </Typography>
                            <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ my: 0.5 }}>
                                {sections.length} <Typography component="span" variant="body2" color="text.secondary">lớp</Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Học kỳ hiện tại</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                                Tổng Số Tín Chỉ Giảng Dạy
                            </Typography>
                            <Typography variant="h4" fontWeight={800} color="secondary.main" sx={{ my: 0.5 }}>
                                {totalCredits} <Typography component="span" variant="body2" color="text.secondary">tín chỉ</Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Đồng bộ từ chương trình đào tạo</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                                Tổng Số Sinh Viên
                            </Typography>
                            <Typography variant="h4" fontWeight={800} color="success.main" sx={{ my: 0.5 }}>
                                {totalStudents} <Typography component="span" variant="body2" color="text.secondary">sinh viên</Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Đã đăng ký vào lớp</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Table */}
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer component={Box}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Mã Lớp HP</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Tên Môn Học</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Số Tín Chỉ</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Thời Khóa Biểu</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Phòng</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Sĩ Số</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Xác Nhận Lịch Dạy</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                            <CircularProgress size={28} sx={{ mb: 1 }} />
                                            <Typography variant="body2" color="text.secondary">Đang tải lịch giảng dạy...</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : sections.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Bạn chưa được phân công giảng dạy lớp học phần nào trong học kỳ này.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sections.map((sec) => (
                                        <TableRow key={sec._id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                                                    {sec.sectionCode}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {sec.semester}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {sec.course?.name || '—'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                    {sec.course?.code}
                                                </Typography>
                                            </TableCell>

                                            {/* Cột Số Tín Chỉ đồng bộ */}
                                            <TableCell align="center">
                                                <Chip
                                                    label={`${sec.course?.credits || 3} Tín chỉ`}
                                                    size="small"
                                                    color="primary"
                                                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {DAY_LABELS[sec.dayOfWeek] || `Thứ ${sec.dayOfWeek}`}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {sec.shift}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Chip
                                                    icon={<RoomIcon sx={{ fontSize: '14px !important' }} />}
                                                    label={`Phòng ${sec.room}`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>

                                            <TableCell align="center">
                                                <Typography variant="body2" fontWeight={700} color="success.main">
                                                    {sec.students?.length || 0} / {sec.maxStudents || 50}
                                                </Typography>
                                            </TableCell>

                                            {/* Cột Xác Thực / Đề Xuất Lịch Dạy */}
                                            <TableCell align="center">
                                                {sec.teacherApprovalStatus === 'accepted' ? (
                                                    <Chip
                                                        icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                                        label="Đã Xác Nhận (Đang hiện trên Cổng SV)"
                                                        color="success"
                                                        size="small"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                ) : sec.teacherApprovalStatus === 'rejected' ? (
                                                    <Box>
                                                        <Chip
                                                            icon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
                                                            label="Đã Từ Chối - Chờ Admin Xếp Lại"
                                                            color="error"
                                                            size="small"
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                        {sec.teacherFeedback && (
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, maxWidth: 220, mx: 'auto', fontStyle: 'italic', fontSize: '0.7rem' }}>
                                                                Đề xuất: "{sec.teacherFeedback}"
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                ) : (
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Button
                                                            variant="contained"
                                                            color="success"
                                                            size="small"
                                                            startIcon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                                            onClick={() => handleAccept(sec)}
                                                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', px: 1.5 }}
                                                        >
                                                            Xác Nhận
                                                        </Button>
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            startIcon={<ScheduleIcon sx={{ fontSize: '14px !important' }} />}
                                                            onClick={() => {
                                                                setRejectTarget(sec);
                                                                setProposalText('');
                                                            }}
                                                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', px: 1.5 }}
                                                        >
                                                            Từ Chối / Đề Xuất
                                                        </Button>
                                                    </Stack>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Dialog Từ Chối & Đề Xuất Thời Gian Dạy */}
            <Dialog open={!!rejectTarget} onClose={() => !submitting && setRejectTarget(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                    <ScheduleIcon /> Từ Chối & Đề Xuất Thời Gian Dạy Mới
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2, fontSize: '0.9rem' }}>
                        Lớp học phần: <strong>{rejectTarget?.course?.name}</strong> ({rejectTarget?.sectionCode})
                        <br />
                        Lịch dạy hiện tại: <strong>{DAY_LABELS[rejectTarget?.dayOfWeek]} — {rejectTarget?.shift} (Phòng {rejectTarget?.room})</strong>
                    </DialogContentText>

                    <TextField
                        autoFocus
                        label="Lý do từ chối & Đề xuất thời gian dạy mới"
                        placeholder="VD: Em bận nghiên cứu sáng thứ 2, đề xuất chuyển lịch dạy sang Thứ 4 Ca 2 phòng B102..."
                        fullWidth
                        multiline
                        rows={3}
                        value={proposalText}
                        onChange={(e) => setProposalText(e.target.value)}
                        disabled={submitting}
                    />

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        💡 Đề xuất này sẽ được gửi trực tiếp đến trang của Phòng Đào Tạo (Admin). Sau khi Admin điều chỉnh và gửi lại lịch mới, bạn có thể kiểm tra và xác nhận lại.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setRejectTarget(null)} disabled={submitting} color="inherit">
                        Hủy Bỏ
                    </Button>
                    <Button
                        onClick={handleConfirmReject}
                        variant="contained"
                        color="error"
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
                    >
                        {submitting ? 'Đang gửi...' : 'Gửi Đề Xuất Về Admin'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: '100%' }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
