import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from '../utils/axiosConfig';
import { updateUser } from '../store/authSlice';
import {
    Box, Typography, Paper, Grid, TextField, Button, MenuItem,
    Stack, Avatar, Alert, CircularProgress, Card, CardContent, Chip, Divider, alpha
} from '@mui/material';
import {
    Save as SaveIcon,
    AccountCircle,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Business as OrgIcon,
    Badge as BadgeIcon,
    AdminPanelSettings as RoleIcon,
    PhotoCamera
} from '@mui/icons-material';

function Profile() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [gender, setGender] = useState(user?.gender || 'Nam');
    const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');

    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setAlert(null);
        try {
            const res = await axios.put('/auth/profile', {
                name,
                email,
                phone,
                gender,
                dateOfBirth
            });

            if (res.data.success) {
                // Update avatar if changed
                if (avatar !== user.avatar) {
                    const avRes = await axios.post('/auth/avatar', { avatar });
                    if (avRes.data.success) {
                        res.data.user.avatar = avRes.data.avatar;
                    }
                }
                dispatch(updateUser(res.data.user));
                setAlert({ type: 'success', msg: '✅ Cập nhật hồ sơ cá nhân thành công!' });
            }
        } catch (err) {
            setAlert({ type: 'error', msg: err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white',
                boxShadow: '0 20px 40px rgba(67, 56, 202, 0.25)'
            }}>
                <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
                    <AccountCircle sx={{ fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800}>Thông Tin Cá Nhân</Typography>
                </Stack>
                <Typography sx={{ opacity: 0.85 }}>Xem và cập nhật thông tin hồ sơ của bạn</Typography>
            </Box>

            {alert && (
                <Alert severity={alert.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}

            <Grid container spacing={4}>
                {/* Left side Card: Avatar & Summary Info */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, textAlign: 'center', p: 3 }}>
                        <CardContent>
                            <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                                <Avatar
                                    src={avatar || user?.avatar}
                                    alt={name}
                                    sx={{
                                        width: 140, height: 140, mx: 'auto',
                                        border: '4px solid', borderColor: 'primary.main',
                                        boxShadow: '0 8px 24px rgba(79, 70, 229, 0.15)'
                                    }}
                                />
                            </Box>
                            <Typography variant="h5" fontWeight={800} gutterBottom>{user?.name}</Typography>
                            <Chip
                                label={user?.role === 'admin' ? 'Quản trị viên' : 'Giảng viên'}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 700, px: 2, mb: 3 }}
                            />

                            <Divider sx={{ my: 2.5 }} />

                            <Stack gap={2} sx={{ textAlign: 'left' }}>
                                <Stack direction="row" alignItems="center" gap={1.5}>
                                    <BadgeIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Mã số cán bộ</Typography>
                                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">{user?.code || '—'}</Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" alignItems="center" gap={1.5}>
                                    <OrgIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Đơn vị / Khoa</Typography>
                                        <Typography variant="body2" fontWeight={600}>{user?.department || 'Công nghệ thông tin'}</Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" alignItems="center" gap={1.5}>
                                    <RoleIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Trạng thái công tác</Typography>
                                        <Typography variant="body2" fontWeight={600} color="success.main">{user?.status || 'Đang công tác'}</Typography>
                                    </Box>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right side Form: Edit profile */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight={850} mb={3}>✏️ Cập nhật thông tin chi tiết</Typography>
                        <form onSubmit={handleSave}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth label="Họ và Tên" value={name}
                                        onChange={(e) => setName(e.target.value)} required
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth label="Địa chỉ Email" type="email" value={email}
                                        onChange={(e) => setEmail(e.target.value)} required
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth label="Số điện thoại" value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select fullWidth label="Giới tính" value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                    >
                                        <MenuItem value="Nam">Nam</MenuItem>
                                        <MenuItem value="Nữ">Nữ</MenuItem>
                                        <MenuItem value="Khác">Khác</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth label="Ngày sinh" type="date" value={dateOfBirth}
                                        onChange={(e) => setDateOfBirth(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth label="Đường dẫn Ảnh đại diện (URL)" value={avatar}
                                        onChange={(e) => setAvatar(e.target.value)}
                                        helperText="Sử dụng liên kết ảnh (ví dụ: Unsplash, Imgur...)"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                    />
                                </Grid>
                            </Grid>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                                <Button
                                    type="submit" variant="contained" size="large"
                                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                    disabled={saving}
                                    sx={{
                                        px: 4, py: 1.3,
                                        borderRadius: 2.5,
                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                        boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
                                        textTransform: 'none', fontWeight: 700,
                                        '&:hover': { background: 'linear-gradient(135deg, #4338ca, #6d28d9)' }
                                    }}
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                                </Button>
                            </Box>
                        </form>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Profile;
