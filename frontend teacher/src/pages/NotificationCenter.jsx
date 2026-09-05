import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Paper, Stack, TextField, MenuItem, Button, Alert,
    Card, CardContent, Chip, CircularProgress, Divider, alpha,
    Grid, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar
} from '@mui/material';
import {
    Notifications as BellIcon, Send as SendIcon, CheckCircle,
    School as SchoolIcon, Grade as GradeIcon, Assignment
} from '@mui/icons-material';

const NOTIF_TYPE_META = {
    grade_published: { label: '📢 Điểm', color: '#4F46E5', bg: alpha('#4F46E5', 0.08) },
    grade_locked: { label: '🔒 Khóa điểm', color: '#EF4444', bg: alpha('#EF4444', 0.08) },
    attendance: { label: '📅 Điểm danh', color: '#059669', bg: alpha('#059669', 0.08) },
    assignment: { label: '📝 Bài tập', color: '#D97706', bg: alpha('#D97706', 0.08) },
    announcement: { label: '📣 Thông báo', color: '#0891B2', bg: alpha('#0891B2', 0.08) },
    system: { label: '⚙️ Hệ thống', color: '#6B7280', bg: alpha('#6B7280', 0.08) },
};

function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sendDialog, setSendDialog] = useState(false);
    const [classSections, setClassSections] = useState([]);
    const [snack, setSnack] = useState(null);
    const [form, setForm] = useState({
        classSectionId: '', title: '', content: '', type: 'announcement'
    });

    useEffect(() => {
        fetchNotifications();
        fetchClassSections();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/teacher/notifications');
            if (res.data.success) {
                setNotifications(res.data.data);
                setUnreadCount(res.data.unreadCount);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchClassSections = async () => {
        try {
            const res = await axios.get('/academic/class-sections');
            if (res.data.success) setClassSections(res.data.data);
        } catch (err) { console.error(err); }
    };

    const markAllRead = async () => {
        try {
            await axios.put('/teacher/notifications/read-all');
            fetchNotifications();
        } catch (err) { console.error(err); }
    };

    const markRead = async (id) => {
        try {
            await axios.put(`/teacher/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { console.error(err); }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/teacher/notifications/send', form);
            setSendDialog(false);
            setSnack({ severity: 'success', msg: res.data.message });
            setForm({ classSectionId: '', title: '', content: '', type: 'announcement' });
        } catch (err) {
            setSnack({ severity: 'error', msg: 'Lỗi khi gửi thông báo' });
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white', boxShadow: '0 20px 40px rgba(8,145,178,0.3)'
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
                            <BellIcon sx={{ fontSize: 32 }} />
                            <Typography variant="h4" fontWeight={800}>Trung tâm Thông báo</Typography>
                        </Stack>
                        <Typography sx={{ opacity: 0.85 }}>Gửi thông báo tới sinh viên và xem lịch sử thông báo</Typography>
                    </Box>
                    <Stack direction="row" gap={2}>
                        {unreadCount > 0 && (
                            <Button variant="outlined" onClick={markAllRead}
                                sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                ✅ Đọc tất cả ({unreadCount})
                            </Button>
                        )}
                        <Button variant="contained" startIcon={<SendIcon />} onClick={() => setSendDialog(true)}
                            sx={{ bgcolor: 'white', color: '#0891B2', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}>
                            Gửi thông báo mới
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            {loading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
            ) : (
                <Stack gap={2}>
                    {notifications.length === 0 && (
                        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <BellIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                            <Typography color="text.secondary">Chưa có thông báo nào.</Typography>
                        </Paper>
                    )}
                    {notifications.map(n => {
                        const meta = NOTIF_TYPE_META[n.type] || NOTIF_TYPE_META.system;
                        return (
                            <Card
                                key={n._id}
                                elevation={0}
                                onClick={() => !n.isRead && markRead(n._id)}
                                sx={{
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: n.isRead ? 'divider' : alpha('#4F46E5', 0.3),
                                    bgcolor: n.isRead ? 'background.paper' : alpha('#4F46E5', 0.03),
                                    cursor: n.isRead ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': { boxShadow: 3 }
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ flex: 1 }}>
                                            <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
                                                {!n.isRead && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4F46E5', flexShrink: 0 }} />}
                                                <Chip label={meta.label} size="small" sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, fontSize: '0.72rem' }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                                                </Typography>
                                            </Stack>
                                            <Typography fontWeight={700} mb={0.5}>{n.title}</Typography>
                                            <Typography variant="body2" color="text.secondary">{n.content}</Typography>
                                        </Box>
                                        {n.isRead && <CheckCircle sx={{ color: '#059669', opacity: 0.5, flexShrink: 0, ml: 2 }} />}
                                    </Stack>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>
            )}

            {/* Send Dialog */}
            <Dialog open={sendDialog} onClose={() => setSendDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <Box component="form" onSubmit={handleSend}>
                    <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
                        📣 Gửi Thông báo mới
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <Stack gap={2.5}>
                            <TextField
                                select fullWidth label="Gửi tới lớp học phần" required
                                value={form.classSectionId}
                                onChange={(e) => setForm({ ...form, classSectionId: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            >
                                {classSections.map(sec => (
                                    <MenuItem key={sec._id} value={sec._id}>
                                        {sec.sectionCode} — {sec.course?.name} ({sec.students?.length || 0} SV)
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select fullWidth label="Loại thông báo"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            >
                                {Object.entries(NOTIF_TYPE_META).map(([key, meta]) => (
                                    <MenuItem key={key} value={key}>{meta.label}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                fullWidth required label="Tiêu đề thông báo"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="VD: Thông báo lịch thi giữa kỳ"
                            />
                            <TextField
                                fullWidth required multiline rows={4} label="Nội dung"
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                placeholder="Nhập nội dung thông báo chi tiết..."
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setSendDialog(false)} color="inherit">Hủy</Button>
                        <Button type="submit" variant="contained" startIcon={<SendIcon />} sx={{ px: 3 }}>
                            Gửi thông báo
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack?.severity} onClose={() => setSnack(null)} sx={{ borderRadius: 2 }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}

export default NotificationCenter;
