import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from '../utils/axiosConfig';
import { updateUser } from '../store/authSlice';
import {
    Box, Typography, Paper, Grid, TextField, Button, MenuItem,
    Stack, Avatar, Alert, CircularProgress, Card, CardContent,
    Chip, Divider, Tooltip, IconButton, LinearProgress
} from '@mui/material';
import {
    Save as SaveIcon,
    Badge as BadgeIcon,
    School as SchoolIcon,
    Work as WorkIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Cake as CakeIcon,
    Wc as GenderIcon,
    PhotoCamera,
    UploadFile as UploadIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckIcon,
    PersonOutlined as PersonIcon,
    Link as LinkIcon,
    RotateLeft as ResetIcon
} from '@mui/icons-material';

function Profile() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const fileInputRef = useRef(null);

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [gender, setGender] = useState(user?.gender || 'Nam');
    const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? user.dateOfBirth.substring(0, 10) : '');

    // Avatar state
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);

    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);

    // Handle file selection from device
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            setAlert({ type: 'error', msg: 'Chỉ hỗ trợ định dạng ảnh JPG, PNG, WebP hoặc GIF.' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setAlert({ type: 'error', msg: 'Ảnh không được vượt quá 5MB.' });
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        const reader = new FileReader();
        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 25, 90));
        }, 70);

        reader.onload = (ev) => {
            clearInterval(progressInterval);
            setUploadProgress(100);
            const base64 = ev.target.result;
            setAvatar(base64);
            setAvatarPreview(base64);
            setAlert({ type: 'info', msg: '🖼️ Đã chọn ảnh thành công. Nhấn "Lưu Thay Đổi" để cập nhật hồ sơ.' });
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 400);
        };

        reader.onerror = () => {
            clearInterval(progressInterval);
            setUploading(false);
            setUploadProgress(0);
            setAlert({ type: 'error', msg: 'Không thể đọc file ảnh. Vui lòng thử lại.' });
        };

        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleRemoveAvatar = () => {
        setAvatar('');
        setAvatarPreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setAlert({ type: 'info', msg: 'Đã xóa ảnh đại diện. Nhấn "Lưu Thay Đổi" để hoàn tất.' });
    };

    const handleReset = () => {
        setName(user?.name || '');
        setEmail(user?.email || '');
        setPhone(user?.phone || '');
        setGender(user?.gender || 'Nam');
        setDateOfBirth(user?.dateOfBirth ? user.dateOfBirth.substring(0, 10) : '');
        setAvatar(user?.avatar || '');
        setAvatarPreview(user?.avatar || '');
        setAlert(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setAlert(null);

        if (phone && !/^\d{10}$/.test(phone)) {
            setAlert({ type: 'error', msg: 'Số điện thoại phải bao gồm đúng 10 chữ số.' });
            setSaving(false);
            return;
        }

        try {
            const res = await axios.put('/auth/profile', {
                name,
                email,
                phone,
                gender,
                dateOfBirth
            });

            if (res.data.success) {
                if (avatar !== user.avatar) {
                    const avRes = await axios.post('/auth/avatar', { avatar });
                    if (avRes.data.success) {
                        res.data.user.avatar = avRes.data.avatar;
                    }
                }
                dispatch(updateUser(res.data.user));
                setAlert({ type: 'success', msg: '🎉 Cập nhật hồ sơ cá nhân thành công!' });
            }
        } catch (err) {
            setAlert({ type: 'error', msg: err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.' });
        } finally {
            setSaving(false);
        }
    };

    const displayAvatar = avatarPreview || avatar;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* Header Hero Banner */}
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
                    borderRadius: '20px',
                    p: { xs: 3, md: 4 },
                    mb: 4,
                    color: 'white',
                    boxShadow: '0 16px 36px rgba(67, 56, 202, 0.25)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Background ambient glow shapes */}
                <Box sx={{
                    position: 'absolute', top: '-20%', right: '-5%',
                    width: 300, height: 300, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />

                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2}>
                    <Box>
                        <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
                            <PersonIcon sx={{ fontSize: 32, color: '#a5b4fc' }} />
                            <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">
                                Hồ Sơ Giảng Viên
                            </Typography>
                        </Stack>
                        <Typography sx={{ opacity: 0.85, fontSize: '0.95rem' }}>
                            Quản lý thông tin lý lịch, địa chỉ liên hệ và ảnh đại diện tài khoản
                        </Typography>
                    </Box>

                    <Chip
                        icon={<WorkIcon sx={{ color: '#fff !important', fontSize: '16px !important' }} />}
                        label={user?.status || 'Đang công tác'}
                        sx={{
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            color: '#86efac',
                            fontWeight: 700,
                            px: 1.5, py: 2.2,
                            borderRadius: '12px',
                            fontSize: '0.85rem'
                        }}
                    />
                </Stack>
            </Paper>

            {alert && (
                <Alert
                    severity={alert.type}
                    sx={{ mb: 3, borderRadius: '12px', fontWeight: 500 }}
                    onClose={() => setAlert(null)}
                >
                    {alert.msg}
                </Alert>
            )}

            <Grid container spacing={3.5}>
                {/* Left side Card: Avatar & Summary Info */}
                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid rgba(226, 232, 240, 0.9)',
                            borderRadius: '20px',
                            p: 3,
                            background: '#ffffff',
                            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)'
                        }}
                    >
                        <CardContent sx={{ p: 0, textAlign: 'center' }}>
                            {/* Clickable Avatar Container */}
                            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                                <Avatar
                                    src={displayAvatar}
                                    alt={name}
                                    sx={{
                                        width: 140, height: 140, mx: 'auto',
                                        border: '4px solid #818cf8',
                                        boxShadow: '0 12px 28px rgba(79, 70, 229, 0.22)',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        '&:hover': { transform: 'scale(1.02)', opacity: 0.9 }
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                />
                                <Tooltip title="Bấm để tải ảnh đại diện từ máy tính" placement="top">
                                    <Box
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{
                                            position: 'absolute', bottom: 4, right: 6,
                                            width: 38, height: 38, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', border: '3px solid white',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                            transition: 'transform 0.2s',
                                            '&:hover': { transform: 'scale(1.15)' }
                                        }}
                                    >
                                        <PhotoCamera sx={{ fontSize: 19, color: 'white' }} />
                                    </Box>
                                </Tooltip>
                            </Box>

                            {/* Upload progress */}
                            {uploading && (
                                <Box sx={{ mb: 2, px: 2 }}>
                                    <Typography variant="caption" color="primary" fontWeight={700}>
                                        Đang tải ảnh lên... {uploadProgress}%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={uploadProgress}
                                        sx={{ mt: 0.8, borderRadius: 2, height: 6 }}
                                    />
                                </Box>
                            )}

                            {/* Avatar Buttons */}
                            <Stack direction="row" gap={1.5} justifyContent="center" mb={2.5}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<UploadIcon />}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    sx={{
                                        borderRadius: '10px',
                                        textTransform: 'none',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        borderColor: '#c7d2fe',
                                        color: '#4338ca',
                                        '&:hover': { borderColor: '#6366f1', background: '#f5f3ff' }
                                    }}
                                >
                                    Tải ảnh lên
                                </Button>

                                {displayAvatar && (
                                    <Tooltip title="Xóa ảnh đại diện">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={handleRemoveAvatar}
                                            sx={{
                                                borderRadius: '10px',
                                                textTransform: 'none',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            Xóa ảnh
                                        </Button>
                                    </Tooltip>
                                )}
                            </Stack>

                            <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mb: 0.5 }}>
                                {user?.name || 'Giảng viên'}
                            </Typography>

                            <Chip
                                label={user?.role === 'admin' ? 'Quản trị viên' : 'Giảng viên chính thức'}
                                sx={{
                                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    px: 1.5, py: 0.5,
                                    mb: 2.5
                                }}
                            />

                            <Divider sx={{ my: 2.5, borderColor: '#f1f5f9' }} />

                            {/* Summary Details List */}
                            <Stack gap={2} sx={{ textAlign: 'left' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8, p: 1.5, background: '#f8fafc', borderRadius: '12px' }}>
                                    <BadgeIcon sx={{ color: '#6366f1', fontSize: 22 }} />
                                    <Box>
                                        <Typography variant="caption" color="#64748b" fontWeight={600} display="block">MÃ SỐ CÁN BỘ</Typography>
                                        <Typography variant="body2" fontWeight={800} color="#0f172a" fontFamily="monospace">{user?.code || '—'}</Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8, p: 1.5, background: '#f8fafc', borderRadius: '12px' }}>
                                    <SchoolIcon sx={{ color: '#0284c7', fontSize: 22 }} />
                                    <Box>
                                        <Typography variant="caption" color="#64748b" fontWeight={600} display="block">ĐƠN VỊ / KHOA</Typography>
                                        <Typography variant="body2" fontWeight={700} color="#0f172a">{user?.department || 'Công nghệ thông tin'}</Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8, p: 1.5, background: '#f8fafc', borderRadius: '12px' }}>
                                    <EmailIcon sx={{ color: '#16a34a', fontSize: 22 }} />
                                    <Box sx={{ overflow: 'hidden' }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={600} display="block">EMAIL CÔNG TÁC</Typography>
                                        <Typography variant="body2" fontWeight={600} color="#0f172a" sx={{ wordBreak: 'break-all' }}>{user?.email || '—'}</Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right side Form: Edit profile */}
                <Grid item xs={12} md={8}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3, sm: 4 },
                            borderRadius: '20px',
                            border: '1px solid rgba(226, 232, 240, 0.9)',
                            background: '#ffffff',
                            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5, pb: 2, borderBottom: '1px solid #f1f5f9' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <PersonIcon sx={{ color: '#4f46e5', fontSize: 20 }} />
                                </Box>
                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                    Cập nhật thông tin chi tiết
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="#94a3b8" fontWeight={600}>
                                Các trường (*) là bắt buộc
                            </Typography>
                        </Box>

                        <form onSubmit={handleSave}>
                            <Grid container spacing={2.5}>
                                {/* Họ và Tên */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 0.8 }}>
                                        Họ và Tên <span style={{ color: '#ef4444' }}>*</span>
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        placeholder="Nhập họ và tên giảng viên..."
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                background: '#f8fafc',
                                                '&:hover': { background: '#ffffff' },
                                                '&.Mui-focused': { background: '#ffffff' }
                                            }
                                        }}
                                    />
                                </Grid>

                                {/* Email */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 0.8 }}>
                                        Địa chỉ Email <span style={{ color: '#ef4444' }}>*</span>
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="email"
                                        placeholder="gv001@university.edu.vn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                background: '#f8fafc',
                                                '&:hover': { background: '#ffffff' },
                                                '&.Mui-focused': { background: '#ffffff' }
                                            }
                                        }}
                                    />
                                </Grid>

                                {/* Số điện thoại */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 0.8 }}>
                                        Số điện thoại
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        placeholder="VD: 0901234567..."
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        InputProps={{
                                            startAdornment: <PhoneIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 18 }} />
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                background: '#f8fafc',
                                                '&:hover': { background: '#ffffff' },
                                                '&.Mui-focused': { background: '#ffffff' }
                                            }
                                        }}
                                    />
                                </Grid>

                                {/* Giới tính */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 0.8 }}>
                                        Giới tính
                                    </Typography>
                                    <TextField
                                        select
                                        fullWidth
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        InputProps={{
                                            startAdornment: <GenderIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 18 }} />
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                background: '#f8fafc',
                                                '&:hover': { background: '#ffffff' },
                                                '&.Mui-focused': { background: '#ffffff' }
                                            }
                                        }}
                                    >
                                        <MenuItem value="Nam">Nam</MenuItem>
                                        <MenuItem value="Nữ">Nữ</MenuItem>
                                        <MenuItem value="Khác">Khác</MenuItem>
                                    </TextField>
                                </Grid>

                                {/* Ngày sinh */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 0.8 }}>
                                        Ngày sinh
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        value={dateOfBirth}
                                        onChange={(e) => setDateOfBirth(e.target.value)}
                                        InputProps={{
                                            startAdornment: <CakeIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 18 }} />
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                background: '#f8fafc',
                                                '&:hover': { background: '#ffffff' },
                                                '&.Mui-focused': { background: '#ffffff' }
                                            }
                                        }}
                                    />
                                </Grid>

                                {/* URL ảnh đại diện */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 0.8 }}>
                                        Link ảnh đại diện (Tùy chọn)
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        placeholder="https://..."
                                        value={avatar?.startsWith('data:') ? '' : avatar}
                                        onChange={(e) => {
                                            setAvatar(e.target.value);
                                            setAvatarPreview(e.target.value);
                                        }}
                                        InputProps={{
                                            startAdornment: <LinkIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 18 }} />,
                                            endAdornment: avatar?.startsWith('data:') ? (
                                                <Tooltip title="Đang sử dụng ảnh được tải từ máy tính">
                                                    <CheckIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                                                </Tooltip>
                                            ) : null
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                background: '#f8fafc',
                                                '&:hover': { background: '#ffffff' },
                                                '&.Mui-focused': { background: '#ffffff' }
                                            }
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 3.5, borderColor: '#f1f5f9' }} />

                            {/* Action Buttons */}
                            <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={2}>
                                <Button
                                    type="button"
                                    variant="outlined"
                                    startIcon={<ResetIcon />}
                                    onClick={handleReset}
                                    sx={{
                                        borderRadius: '12px',
                                        px: 3, py: 1.2,
                                        borderColor: '#cbd5e1',
                                        color: '#64748b',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        '&:hover': { borderColor: '#94a3b8', background: '#f8fafc' }
                                    }}
                                >
                                    Đặt lại
                                </Button>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                    disabled={saving || uploading}
                                    sx={{
                                        borderRadius: '12px',
                                        px: 4, py: 1.2,
                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                        boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #4338ca, #6d28d9)',
                                            boxShadow: '0 10px 28px rgba(79, 70, 229, 0.4)'
                                        }
                                    }}
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                                </Button>
                            </Stack>
                        </form>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Profile;
