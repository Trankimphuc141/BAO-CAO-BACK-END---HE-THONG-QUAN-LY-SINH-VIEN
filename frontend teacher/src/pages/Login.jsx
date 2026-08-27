import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../store/authSlice';
import axios from '../utils/axiosConfig';
import {
    Container, Box, Typography, TextField, Button, Paper, Alert,
    Stack, Chip, InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import {
    LockOutlined as LockIcon,
    Visibility, VisibilityOff
} from '@mui/icons-material';

const BG_GRAD = 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)';

function Login() {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/auth/login', { code, password });
            if (response.data.success) {
                dispatch(loginSuccess(response.data));
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickFill = (role) => {
        if (role === 'teacher') {
            setCode('GV001');
            setPassword('123456');
        } else if (role === 'student') {
            setCode('SV001');
            setPassword('123456');
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: BG_GRAD,
            position: 'relative',
            overflow: 'hidden',
            p: 2
        }}>
            {/* Glowing background blobs */}
            <Box sx={{
                position: 'absolute', top: '15%', left: '15%',
                width: 320, height: 320, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
                filter: 'blur(40px)'
            }} />
            <Box sx={{
                position: 'absolute', bottom: '15%', right: '15%',
                width: 350, height: 350, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
                filter: 'blur(50px)'
            }} />

            <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 2 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 4, sm: 5 },
                        borderRadius: 5,
                        bgcolor: 'rgba(15, 23, 42, 0.45)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    {/* Brand Header */}
                    <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
                        <Box sx={{
                            width: 56, height: 56, borderRadius: '12px',
                            bgcolor: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                            overflow: 'hidden'
                        }}>
                            <img src="/vus_logo.png" alt="VUS" style={{ width: 52, height: 52, objectFit: 'contain' }} />
                        </Box>
                        <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>
                            VUS
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mb: 4, fontWeight: 500 }}>
                        CỔ́NG THÔNG TIN GIẢNG VIÊN & QUẢN TRỊ
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', '& .MuiAlert-icon': { color: '#fca5a5' } }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="code"
                            label="Mã Giảng Viên"
                            name="code"
                            autoComplete="username"
                            autoFocus
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }}
                            InputProps={{
                                style: { color: 'white', borderRadius: 12 },
                                sx: {
                                    bgcolor: 'rgba(255,255,255,0.03)',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#818cf8' },
                                }
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Mật Khẩu"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }}
                            InputProps={{
                                style: { color: 'white', borderRadius: 12 },
                                sx: {
                                    bgcolor: 'rgba(255,255,255,0.03)',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#818cf8' },
                                },
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: 'rgba(255,255,255,0.45)' }}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                mt: 4, mb: 3, py: 1.6,
                                borderRadius: 3,
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.35)',
                                fontSize: '1rem', fontWeight: 700,
                                textTransform: 'none',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 12px 30px rgba(99, 102, 241, 0.45)',
                                    background: 'linear-gradient(135deg, #5a52ff, #8b4eff)',
                                },
                                '&:active': { transform: 'translateY(1px)' }
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Đăng Nhập'}
                        </Button>
                    </Box>

                    {/* Helper Box for Developer / Demo */}
                    <Box sx={{
                        mt: 2, p: 2, width: '100%',
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        textAlign: 'center'
                    }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 1.5, fontWeight: 500 }}>
                            ⚡ ĐĂNG NHẬP NHANH (DEMO)
                        </Typography>
                        <Stack direction="row" justifyContent="center" gap={1.5} flexWrap="wrap">
                            <Chip
                                label="GV Nguyễn Văn An (GV001)"
                                onClick={() => handleQuickFill('teacher')}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(79,70,229,0.15)',
                                    color: '#a5b4fc',
                                    border: '1px solid rgba(79,70,229,0.3)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    '&:hover': { bgcolor: 'rgba(79,70,229,0.25)' }
                                }}
                            />
                            <Chip
                                label="GV Trần Thị Bình (GV002)"
                                onClick={() => { setCode('GV002'); setPassword('123456'); }}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(236,72,153,0.15)',
                                    color: '#fbcfe8',
                                    border: '1px solid rgba(236,72,153,0.3)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    '&:hover': { bgcolor: 'rgba(236,72,153,0.25)' }
                                }}
                            />
                        </Stack>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}

export default Login;
