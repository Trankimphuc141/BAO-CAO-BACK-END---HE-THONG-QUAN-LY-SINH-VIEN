import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Grid, Card, CardContent, Stack, Button, Chip, alpha,
    CircularProgress, Alert, Collapse, Divider, Tooltip, IconButton
} from '@mui/material';
import {
    People as PeopleIcon,
    AssignmentTurnedIn as AttIcon,
    School as SchoolIcon,
    ArrowForward,
    AutoGraph as AutoGraphIcon,
    Grade as GradeIcon,
    QrCode as QrIcon,
    Notifications as NotifIcon,
    DataObject as SeedIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon,
    Refresh as RefreshIcon,
    Info as InfoIcon,
} from '@mui/icons-material';

function StatCard({ label, value, icon, color, desc, onClick }) {
    return (
        <Card elevation={0} onClick={onClick} sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': onClick ? {
                transform: 'translateY(-4px)',
                boxShadow: `0 12px 28px ${alpha(color, 0.15)}`,
                borderColor: color,
            } : {}
        }}>
            <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {label}
                        </Typography>
                        <Typography variant="h4" fontWeight={850} mt={0.5} mb={0.5} sx={{ color }}>
                            {value ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{desc}</Typography>
                    </Box>
                    <Box sx={{
                        p: 1.5, borderRadius: '14px',
                        bgcolor: alpha(color, 0.1), color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {icon}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function QuickActionCard({ label, desc, icon, path, gradient, shadow, navigate }) {
    return (
        <Card elevation={0} onClick={() => navigate(path)} sx={{
            borderRadius: 3, cursor: 'pointer', background: gradient,
            color: 'white', overflow: 'hidden', position: 'relative',
            transition: 'all 0.3s',
            '&:hover': { transform: 'translateY(-6px)', boxShadow: `0 20px 40px ${shadow}` }
        }}>
            <Box sx={{
                position: 'absolute', top: -30, right: -30, width: 140,
                height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)'
            }} />
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ mb: 1.5, opacity: 0.9 }}>{icon}</Box>
                <Typography variant="h6" fontWeight={700}>{label}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5, fontSize: '0.8rem' }}>{desc}</Typography>
                <Stack direction="row" alignItems="center" gap={0.5} mt={2} sx={{ opacity: 0.75 }}>
                    <Typography variant="caption" fontWeight={600}>Truy cập ngay</Typography>
                    <ArrowForward sx={{ fontSize: 13 }} />
                </Stack>
            </CardContent>
        </Card>
    );
}

function Dashboard() {
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);
    const [stats, setStats] = useState({ total: 0, sections: 0, courses: 0 });
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [seedResult, setSeedResult] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [studRes, secRes] = await Promise.all([
                axios.get('/teacher/students', { params: { page: 1, limit: 1 } }).catch(() => ({ data: { total: 0 } })),
                axios.get('/academic/class-sections').catch(() => ({ data: { count: 0 } })),
            ]);
            setStats({
                total: studRes.data.total || studRes.data.data?.length || 0,
                sections: secRes.data.count || secRes.data.data?.length || 0,
                courses: secRes.data.courses || 0,
            });
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { fetchStats(); }, []);

    const handleSeed = async () => {
        if (!window.confirm('Tạo dữ liệu mẫu (giảng viên, sinh viên, môn học, lớp học phần, điểm, điểm danh)?\n\nChỉ tạo thêm, không xóa dữ liệu hiện có.')) return;
        setSeeding(true);
        setSeedResult(null);
        try {
            const res = await axios.post('/seed/run');
            setSeedResult({ type: 'success', data: res.data });
            await fetchStats();
        } catch (err) {
            setSeedResult({ type: 'error', msg: err.response?.data?.message || err.message });
        }
        setSeeding(false);
    };

    const handleClear = async () => {
        if (!window.confirm('⚠️ XÓA TOÀN BỘ dữ liệu mẫu (sinh viên, giảng viên, môn học, điểm, điểm danh)?\n\nThao tác này KHÔNG THỂ hoàn tác!')) return;
        setClearing(true);
        setSeedResult(null);
        try {
            const res = await axios.delete('/seed/clear');
            setSeedResult({ type: 'info', msg: res.data.message });
            await fetchStats();
        } catch (err) {
            setSeedResult({ type: 'error', msg: err.response?.data?.message || err.message });
        }
        setClearing(false);
    };

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Chào buổi sáng';
        if (h < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    const quickActions = [
        { label: 'Sinh Viên', desc: 'Xem & quản lý hồ sơ sinh viên', icon: <PeopleIcon sx={{ fontSize: 32 }} />, path: '/students', gradient: 'linear-gradient(135deg, #4F46E5, #7C3AED)', shadow: 'rgba(79,70,229,0.4)' },
        { label: 'Nhập Điểm', desc: 'Nhập, sửa, công bố và khóa điểm', icon: <GradeIcon sx={{ fontSize: 32 }} />, path: '/grades', gradient: 'linear-gradient(135deg, #0EA5E9, #38BDF8)', shadow: 'rgba(14,165,233,0.4)' },
        { label: 'Điểm Danh', desc: 'Ghi nhận sự hiện diện buổi học', icon: <AttIcon sx={{ fontSize: 32 }} />, path: '/attendance/mark', gradient: 'linear-gradient(135deg, #059669, #10B981)', shadow: 'rgba(5,150,105,0.4)' },
        { label: 'QR Điểm Danh', desc: 'Tạo mã QR để sinh viên tự check-in', icon: <QrIcon sx={{ fontSize: 32 }} />, path: '/attendance/qr', gradient: 'linear-gradient(135deg, #D97706, #F59E0B)', shadow: 'rgba(217,119,6,0.4)' },
        { label: 'Thông Báo', desc: 'Gửi thông báo đến lớp hoặc cá nhân', icon: <NotifIcon sx={{ fontSize: 32 }} />, path: '/notifications', gradient: 'linear-gradient(135deg, #DB2777, #EC4899)', shadow: 'rgba(219,39,119,0.4)' },
    ];

    return (
        <Box>
            {/* Welcome Hero */}
            <Box sx={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                borderRadius: 4, p: { xs: 3, sm: 4 }, mb: 3, color: 'white',
                position: 'relative', overflow: 'hidden'
            }}>
                <Box sx={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.25) 0%, transparent 70%)' }} />
                <Box sx={{ position: 'absolute', bottom: -80, left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
                <Box sx={{ position: 'relative' }}>
                    <Chip label="🎓 Hệ thống VUS" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', mb: 2, fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.75rem' }} />
                    <Typography variant="h4" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.6rem', sm: '2rem' } }}>
                        {greeting()}, {user?.name?.split(' ').pop() || 'Giảng Viên'} 👋
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.7, maxWidth: 560, fontSize: '0.9rem' }}>
                        Quản lý sinh viên, điểm số và điểm danh — mọi thứ trong một nền tảng.
                    </Typography>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard label="Tổng Sinh Viên" value={loading ? '...' : stats.total}
                        icon={<PeopleIcon sx={{ fontSize: 26 }} />} color="#4F46E5"
                        desc="Đã đăng ký trong hệ thống" onClick={() => navigate('/students')} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard label="Lớp Học Phần" value={loading ? '...' : stats.sections}
                        icon={<SchoolIcon sx={{ fontSize: 26 }} />} color="#059669"
                        desc="Lớp đang phụ trách" onClick={() => navigate('/grades')} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard label="Ngày Hôm Nay" value={new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        icon={<AttIcon sx={{ fontSize: 26 }} />} color="#D97706"
                        desc="Lịch điểm danh hôm nay" onClick={() => navigate('/attendance/mark')} />
                </Grid>
            </Grid>

            {/* Seed data section — visible to admin only */}
            {user?.role === 'admin' && (
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'divider', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
                        <Box>
                            <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                                <SeedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                <Typography fontWeight={700} variant="body1">Dữ liệu Demo</Typography>
                                <Tooltip title="Tạo dữ liệu mẫu để test tính năng: 2 giảng viên, 20 sinh viên, 8 môn học, 16 lớp học phần với điểm số và điểm danh.">
                                    <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                </Tooltip>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Tài khoản demo: <strong>gv001@school.edu.vn / 123456</strong> — <strong>sv001@student.edu.vn / 123456</strong>
                            </Typography>
                        </Box>
                        <Stack direction="row" gap={1.5} flexShrink={0}>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={seeding ? <CircularProgress size={14} color="inherit" /> : <SeedIcon />}
                                onClick={handleSeed}
                                disabled={seeding || clearing}
                                sx={{ borderRadius: 2, bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, textTransform: 'none', fontWeight: 700, px: 2.5 }}
                            >
                                {seeding ? 'Đang tạo...' : 'Tạo dữ liệu mẫu'}
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={clearing ? <CircularProgress size={14} /> : <DeleteIcon />}
                                onClick={handleClear}
                                disabled={seeding || clearing}
                                color="error"
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                {clearing ? 'Đang xóa...' : 'Xóa tất cả'}
                            </Button>
                            <IconButton size="small" onClick={fetchStats} disabled={loading}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Stack>

                    <Collapse in={!!seedResult}>
                        {seedResult?.type === 'success' && (
                            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2, borderRadius: 2 }}>
                                <strong>{seedResult.data.message}</strong>
                                <br />
                                Đã tạo: {seedResult.data.summary?.teachers} giảng viên • {seedResult.data.summary?.students} sinh viên • {seedResult.data.summary?.courses} môn học • {seedResult.data.summary?.classSections} lớp học phần
                                <br />
                                <Typography variant="caption">
                                    Giảng viên: <strong>{seedResult.data.accounts?.teacher?.email}</strong> / <strong>{seedResult.data.accounts?.teacher?.password}</strong> (mã: {seedResult.data.accounts?.teacher?.code})
                                    {' — '}
                                    Sinh viên: <strong>{seedResult.data.accounts?.student?.email}</strong> / <strong>{seedResult.data.accounts?.student?.password}</strong>
                                </Typography>
                            </Alert>
                        )}
                        {(seedResult?.type === 'error') && (
                            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{seedResult.msg}</Alert>
                        )}
                        {seedResult?.type === 'info' && (
                            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>{seedResult.msg}</Alert>
                        )}
                    </Collapse>
                </CardContent>
            </Card>
            )}

            {/* Quick Actions */}
            <Typography variant="h6" fontWeight={700} mb={2}>⚡ Truy cập nhanh</Typography>
            <Grid container spacing={2.5}>
                {quickActions.map(action => (
                    <Grid item xs={12} sm={6} md={4} key={action.label}>
                        <QuickActionCard {...action} navigate={navigate} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}

export default Dashboard;
