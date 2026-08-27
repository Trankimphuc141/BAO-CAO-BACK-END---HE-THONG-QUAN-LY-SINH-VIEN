import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Grid, Card, CardContent, Button, Stack,
    Alert, CircularProgress, Chip, Divider, Paper, List,
    ListItem, ListItemText, ListItemIcon, alpha
} from '@mui/material';
import {
    AdminPanelSettings as AdminIcon,
    DataObject as SeedIcon,
    DeleteForever as DeleteIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarnIcon,
    Info as InfoIcon,
    Security as SecurityIcon,
    People as PeopleIcon,
    School as SchoolIcon,
    ManageAccounts as ManageIcon
} from '@mui/icons-material';
import axios from '../utils/axiosConfig';

export default function AdminPanel() {
    const { user } = useSelector((s) => s.auth);
    const navigate = useNavigate();

    const [seeding, setSeeding] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [result, setResult] = useState(null);

    // Guard: chỉ admin mới xem được
    if (user?.role !== 'admin') {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
                <SecurityIcon sx={{ fontSize: 80, color: 'error.main', opacity: 0.5 }} />
                <Typography variant="h5" fontWeight={800} color="error">Truy cập bị từ chối</Typography>
                <Typography color="text.secondary">Trang này chỉ dành cho Quản trị viên (Admin).</Typography>
                <Button variant="contained" onClick={() => navigate('/')}>Về Dashboard</Button>
            </Box>
        );
    }

    const handleSeed = async () => {
        setSeeding(true);
        setResult(null);
        try {
            const res = await axios.post('/seed/run');
            setResult({ type: 'success', data: res.data });
        } catch (err) {
            setResult({ type: 'error', msg: err.response?.data?.message || 'Lỗi khi tạo dữ liệu mẫu.' });
        } finally {
            setSeeding(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm('⚠️ Bạn chắc chắn muốn XÓA TOÀN BỘ dữ liệu mẫu?')) return;
        setClearing(true);
        setResult(null);
        try {
            const res = await axios.delete('/seed/clear');
            setResult({ type: 'info', msg: res.data.message });
        } catch (err) {
            setResult({ type: 'error', msg: err.response?.data?.message || 'Lỗi khi xóa dữ liệu.' });
        } finally {
            setClearing(false);
        }
    };

    const statItems = [
        { icon: <PeopleIcon />, label: 'Quản lý tài khoản', desc: 'Tạo, chỉnh sửa, vô hiệu hóa tài khoản giảng viên & sinh viên', color: '#4F46E5' },
        { icon: <SchoolIcon />, label: 'Quản lý môn học', desc: 'Thêm mới, sửa, xóa môn học và lớp học phần trong hệ thống', color: '#059669' },
        { icon: <ManageIcon />, label: 'Phân quyền hệ thống', desc: 'Cấu hình quyền truy cập, phân công giảng viên phụ trách', color: '#D97706' },
    ];

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 60%, #7C3AED 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white',
                boxShadow: '0 20px 40px rgba(124, 58, 237, 0.25)'
            }}>
                <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
                    <AdminIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800}>Bảng Điều Khiển Admin</Typography>
                </Stack>
                <Typography sx={{ opacity: 0.8 }}>
                    Chỉ quản trị viên mới có quyền truy cập khu vực này.
                </Typography>
                <Chip
                    label={`Đăng nhập với vai trò: ${user?.role?.toUpperCase()}`}
                    size="small"
                    sx={{ mt: 1.5, bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)' }}
                />
            </Box>

            {/* Admin Capabilities */}
            <Typography variant="h6" fontWeight={700} mb={2}>🔑 Quyền hạn Quản trị</Typography>
            <Grid container spacing={2.5} mb={4}>
                {statItems.map((item, i) => (
                    <Grid item xs={12} md={4} key={i}>
                        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(item.color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, color: item.color }}>
                                    {item.icon}
                                </Box>
                                <Typography fontWeight={700} mb={0.5}>{item.label}</Typography>
                                <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Divider sx={{ mb: 4 }} />

            {/* Seed Data Panel */}
            <Typography variant="h6" fontWeight={700} mb={2}>🗄️ Quản lý Dữ liệu Demo</Typography>
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'warning.light', p: 3, mb: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
                    <Box>
                        <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                            <SeedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <Typography fontWeight={700}>Dữ liệu Demo (Seed)</Typography>
                            <Chip label="Admin Only" size="small" color="error" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Tạo 2 giảng viên, 20 sinh viên, 8 môn học, 16 lớp học phần với điểm số và điểm danh đầy đủ.
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                            Demo: <strong>GV001 / 123456</strong> (giảng viên) — <strong>SV001 / 123456</strong> (sinh viên)
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
                    </Stack>
                </Stack>

                {result && (
                    <Box sx={{ mt: 2 }}>
                        {result.type === 'success' && (
                            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2 }}>
                                <strong>{result.data?.message}</strong><br />
                                Đã tạo: {result.data?.summary?.teachers} GV • {result.data?.summary?.students} SV • {result.data?.summary?.courses} môn học • {result.data?.summary?.classSections} lớp học phần
                            </Alert>
                        )}
                        {result.type === 'error' && (
                            <Alert severity="error" icon={<WarnIcon />} sx={{ borderRadius: 2 }}>{result.msg}</Alert>
                        )}
                        {result.type === 'info' && (
                            <Alert severity="info" icon={<InfoIcon />} sx={{ borderRadius: 2 }}>{result.msg}</Alert>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Security Notice */}
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <strong>Lưu ý bảo mật:</strong> Giảng viên thông thường <strong>không có quyền</strong> truy cập trang này hay thực hiện các thao tác quản trị hệ thống. Chỉ tài khoản có vai trò <code>admin</code> mới được phép.
            </Alert>
        </Box>
    );
}
