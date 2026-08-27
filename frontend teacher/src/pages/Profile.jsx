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
    AccountCircle,
    Business as OrgIcon,
    Badge as BadgeIcon,
    AdminPanelSettings as RoleIcon,
    PhotoCamera,
    UploadFile as UploadIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';

function Profile() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const fileInputRef = useRef(null);

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [gender, setGender] = useState(user?.gender || 'Nam');
    const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');

    // Avatar state: can be a URL or base64 data
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

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setAlert({ type: 'error', msg: 'Chỉ hỗ trợ định dạng ảnh (JPG, PNG, WebP, GIF...)' });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setAlert({ type: 'error', msg: 'Ảnh không được vượt quá 5MB.' });
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        const reader = new FileReader();

        // Simulate progress
        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 20, 90));
        }, 80);

        reader.onload = (ev) => {
            clearInterval(progressInterval);
            setUploadProgress(100);
            const base64 = ev.target.result;
            setAvatar(base64);
            setAvatarPreview(base64);
            setAlert({ type: 'info', msg: '🖼️ Ảnh đã được chọn. Nhấn "Lưu Thay Đổi" để cập nhật.' });
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 600);
        };

        reader.onerror = () => {
            clearInterval(progressInterval);
            setUploading(false);
            setUploadProgress(0);
            setAlert({ type: 'error', msg: 'Không thể đọc file ảnh. Vui lòng thử lại.' });
        };

        reader.readAsDataURL(file);

        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const handleRemoveAvatar = () => {
        setAvatar('');
        setAvatarPreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setAlert({ type: 'info', msg: 'Ảnh đại diện đã được xóa. Nhấn "Lưu Thay Đổi" để áp dụng.' });
    };

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
                // Update avatar separately if changed
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

    const displayAvatar = avatarPreview || avatar;

    return (
        <Box>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

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
                            {/* Clickable Avatar with Upload Overlay */}
                            <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
                                <Avatar
                                    src={displayAvatar}
                                    alt={name}
                                    sx={{
                                        width: 140, height: 140, mx: 'auto',
                                        border: '4px solid', borderColor: 'primary.main',
                                        boxShadow: '0 8px 24px rgba(79, 70, 229, 0.2)',
                                        cursor: 'pointer',
                                        transition: 'opacity 0.2s',
                                        '&:hover': { opacity: 0.8 }
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                />
                                {/* Camera overlay icon */}
                                <Tooltip title="Nhấn để đổi ảnh đại diện" placement="bottom">
                                    <Box
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{
                                            position: 'absolute', bottom: 4, right: 4,
                                            width: 36, height: 36, borderRadius: '50%',
                                            bgcolor: 'primary.main',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', border: '2px solid white',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                                            transition: 'transform 0.2s, bgcolor 0.2s',
                                            '&:hover': { transform: 'scale(1.1)', bgcolor: 'primary.dark' }
                                        }}
                                    >
                                        <PhotoCamera sx={{ fontSize: 18, color: 'white' }} />
                                    </Box>
                                </Tooltip>
                            </Box>

                            {/* Upload progress bar */}
                            {uploading && (
                                <Box sx={{ mb: 2, px: 1 }}>
                                    <Typography variant="caption" color="primary" fontWeight={600}>
                                        Đang xử lý ảnh...
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={uploadProgress}
                                        sx={{ mt: 0.5, borderRadius: 1, height: 6 }}
                                    />
                                </Box>
                            )}

                            {/* Action buttons for avatar */}
                            <Stack direction="row" gap={1} justifyContent="center" mb={2.5}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<UploadIcon />}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.78rem', fontWeight: 600 }}
                                >
                                    Tải ảnh lên
                                </Button>
                                {displayAvatar && (
                                    <Tooltip title="Xóa ảnh đại diện">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={handleRemoveAvatar}
                                            sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 2 }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>

                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                JPG, PNG, WebP, GIF — Tối đa 5MB
                            </Typography>

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
                                        <Typography variant="body2" fontWeight={600} color="success.main">
                                            {user?.status || 'Đang công tác'}
                                        </Typography>
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
                            {/* 2-column CSS grid layout — always 2 cols on desktop, 1 on mobile */}
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                gap: 3,
                                mb: 3
                            }}>
                                <TextField
                                    fullWidth label="Họ và Tên" value={name}
                                    onChange={(e) => setName(e.target.value)} required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                />
                                <TextField
                                    fullWidth label="Địa chỉ Email" type="email" value={email}
                                    onChange={(e) => setEmail(e.target.value)} required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                />
                                <TextField
                                    fullWidth label="Số điện thoại" value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                />
                                <TextField
                                    select fullWidth label="Giới tính" value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                >
                                    <MenuItem value="Nam">Nam</MenuItem>
                                    <MenuItem value="Nữ">Nữ</MenuItem>
                                    <MenuItem value="Khác">Khác</MenuItem>
                                </TextField>
                                <TextField
                                    fullWidth label="Ngày sinh" type="date" value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                />
                                {/* Avatar URL — spans full width on its own row */}
                                <TextField
                                    fullWidth
                                    label="Hoặc nhập URL ảnh đại diện"
                                    value={avatar?.startsWith('data:') ? '' : avatar}
                                    onChange={(e) => {
                                        setAvatar(e.target.value);
                                        setAvatarPreview(e.target.value);
                                    }}
                                    placeholder="https://..."
                                    helperText="Tải ảnh từ thiết bị (bấm vào avatar) hoặc dán link URL"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                                    InputProps={{
                                        endAdornment: avatar?.startsWith('data:') ? (
                                            <Tooltip title="Đang dùng ảnh từ thiết bị">
                                                <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                            </Tooltip>
                                        ) : null
                                    }}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    type="submit" variant="contained" size="large"
                                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                    disabled={saving || uploading}
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
