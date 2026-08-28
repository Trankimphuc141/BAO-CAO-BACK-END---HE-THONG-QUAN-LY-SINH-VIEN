import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../store/authSlice';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, TextField, Button, Alert,
    Stack, Chip, InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

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

    const handleQuickFill = (teacherCode) => {
        setCode(teacherCode);
        setPassword('123456');
    };

    /* ─── Shared input style ─── */
    const inputSx = {
        '& .MuiOutlinedInput-root': {
            color: '#ffffff',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.06)',
            transition: 'background 0.2s',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.14)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.32)' },
            '&.Mui-focused fieldset': { borderColor: '#818cf8', borderWidth: '2px' },
            '&.Mui-focused': { background: 'rgba(255,255,255,0.09)' },
            '& input': { color: '#ffffff', fontWeight: 500, fontSize: '15px', py: '15px' },
        },
        '& .MuiInputLabel-root': {
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 500,
            '&.Mui-focused': { color: '#a5b4fc' },
        },
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1628 40%, #1a0b2e 75%, #0d1117 100%)',
            position: 'relative',
            overflow: 'hidden',
            p: 2,
        }}>
            {/* ── Background blobs ── */}
            {[
                { top: '-8%', left: '-6%', w: 520, h: 520, color: 'rgba(99,102,241,0.22)', blur: 70, delay: '0s' },
                { bottom: '-8%', right: '-6%', w: 560, h: 560, color: 'rgba(168,85,247,0.18)', blur: 80, delay: '1.5s' },
                { top: '42%', right: '18%', w: 280, h: 280, color: 'rgba(59,130,246,0.13)', blur: 55, delay: '3s' },
            ].map((b, i) => (
                <Box key={i} sx={{
                    position: 'absolute',
                    top: b.top, bottom: b.bottom, left: b.left, right: b.right,
                    width: b.w, height: b.h, borderRadius: '50%',
                    background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
                    filter: `blur(${b.blur}px)`,
                    animation: `blobFloat 9s ${b.delay} ease-in-out infinite alternate`,
                    '@keyframes blobFloat': {
                        from: { transform: 'translate(0,0) scale(1)' },
                        to: { transform: 'translate(18px,14px) scale(1.06)' },
                    },
                }} />
            ))}

            {/* ── Card ── */}
            <Box sx={{
                position: 'relative', zIndex: 2,
                width: '100%', maxWidth: 420,
                background: 'rgba(13,18,40,0.78)',
                backdropFilter: 'blur(28px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '28px',
                boxShadow: '0 36px 90px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)',
                overflow: 'visible',   /* ← allow MUI floating labels to show */
            }}>
                {/* Gradient top bar */}
                <Box sx={{
                    height: 3, borderRadius: '28px 28px 0 0',
                    background: 'linear-gradient(90deg,#4f46e5,#7c3aed,#ec4899,#7c3aed,#4f46e5)',
                    backgroundSize: '200%',
                    animation: 'slideGrad 4s linear infinite',
                    '@keyframes slideGrad': { from: { backgroundPosition: '0%' }, to: { backgroundPosition: '200%' } },
                }} />

                <Box sx={{ px: { xs: 4, sm: 5 }, pt: 4, pb: 4 }}>

                    {/* ── Brand (full center) ── */}
                    <Box sx={{ mb: 4, textAlign: 'center', width: '100%' }}>
                        {/* Logo + VUS – căn giữa tuyệt đối */}
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1.5,
                            width: '100%',
                            mb: 1.5,
                        }}>
                            <Box sx={{
                                p: '7px 10px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: '14px',
                                border: '1px solid rgba(255,255,255,0.12)',
                                display: 'flex', alignItems: 'center',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                flexShrink: 0,
                            }}>
                                <img src="/vus_logo.png" alt="VUS" style={{
                                    width: 52, height: 38, objectFit: 'contain',
                                    display: 'block',
                                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
                                }} />
                            </Box>
                            <Typography sx={{
                                fontSize: '2.4rem', fontWeight: 900, color: '#ffffff',
                                letterSpacing: '-1.5px', lineHeight: 1,
                            }}>
                                VUS
                            </Typography>
                        </Box>

                        {/* Subtitle */}
                        <Typography sx={{
                            fontSize: '1.05rem', fontWeight: 700, color: '#ffffff',
                            letterSpacing: '0.02em', textAlign: 'center',
                        }}>
                            Hệ Thống Đăng Nhập Giảng Viên
                        </Typography>
                    </Box>


                    {/* ── Error ── */}
                    {error && (
                        <Alert severity="error" sx={{
                            mb: 3, borderRadius: '12px',
                            bgcolor: 'rgba(239,68,68,0.12)', color: '#fca5a5',
                            border: '1px solid rgba(239,68,68,0.25)',
                            '& .MuiAlert-icon': { color: '#fca5a5' }, fontWeight: 500,
                        }}>
                            {error}
                        </Alert>
                    )}

                    {/* ── Form ── */}
                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={0}>
                            {/* Input 1: Mã Giảng Viên */}
                            <Box>
                                <Typography sx={{
                                    fontSize: '0.8rem', fontWeight: 600,
                                    color: 'rgba(255,255,255,0.75)',
                                    mb: 0.8, ml: 0.5,
                                    letterSpacing: '0.03em',
                                }}>
                                    Mã Giảng Viên <span style={{ color: '#f87171' }}>*</span>
                                </Typography>
                                <TextField
                                    required fullWidth
                                    id="code" name="code"
                                    autoComplete="username" autoFocus
                                    placeholder="Nhập mã giảng viên..."
                                    value={code} onChange={(e) => setCode(e.target.value)}
                                    disabled={loading}
                                    sx={inputSx}
                                />
                            </Box>

                            {/* Input 2: Mật Khẩu */}
                            <Box sx={{ mt: 2.5 }}>
                                <Typography sx={{
                                    fontSize: '0.8rem', fontWeight: 600,
                                    color: 'rgba(255,255,255,0.75)',
                                    mb: 0.8, ml: 0.5,
                                    letterSpacing: '0.03em',
                                }}>
                                    Mật Khẩu <span style={{ color: '#f87171' }}>*</span>
                                </Typography>
                                <TextField
                                    required fullWidth
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password" autoComplete="current-password"
                                    placeholder="Nhập mật khẩu..."
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                    sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#a5b4fc' } }}
                                                >
                                                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={inputSx}
                                />
                            </Box>
                        </Stack>


                        <Button
                            type="submit" fullWidth variant="contained"
                            disabled={loading}
                            sx={{
                                mt: 3.5, py: 1.7, borderRadius: '14px',
                                background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
                                boxShadow: '0 8px 28px rgba(99,102,241,0.42)',
                                fontSize: '1rem', fontWeight: 700, color: '#ffffff',
                                textTransform: 'none', letterSpacing: '0.02em',
                                transition: 'all 0.25s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 14px 38px rgba(99,102,241,0.58)',
                                    background: 'linear-gradient(135deg,#5a52f5 0%,#8b4cf7 100%)',
                                },
                                '&:active': { transform: 'translateY(0)' },
                                '&.Mui-disabled': { background: 'rgba(99,102,241,0.35)', color: 'rgba(255,255,255,0.45)' },
                            }}
                        >
                            {loading
                                ? <Stack direction="row" alignItems="center" spacing={1}>
                                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                                    <span>Đang đăng nhập...</span>
                                  </Stack>
                                : 'Đăng Nhập'
                            }
                        </Button>
                    </Box>

                    {/* ── Demo quick login ── */}
                    <Box sx={{
                        mt: 3.5, p: 2.5, borderRadius: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px dashed rgba(255,255,255,0.12)',
                        textAlign: 'center',
                    }}>
                        <Typography sx={{
                            fontSize: '0.68rem', fontWeight: 700,
                            color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em',
                            textTransform: 'uppercase', mb: 1.5,
                        }}>
                            ⚡ Đăng nhập nhanh (Demo)
                        </Typography>
                        <Stack direction="row" justifyContent="center" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                                { label: 'GV Nguyễn Văn An (GV001)', code: 'GV001', color: '79,70,229', textColor: '#c4b5fd' },
                                { label: 'GV Trần Thị Bình (GV002)', code: 'GV002', color: '236,72,153', textColor: '#fbcfe8' },
                            ].map((t) => (
                                <Chip
                                    key={t.code}
                                    label={t.label}
                                    onClick={() => handleQuickFill(t.code)}
                                    size="small"
                                    sx={{
                                        bgcolor: `rgba(${t.color},0.15)`,
                                        color: t.textColor,
                                        border: `1px solid rgba(${t.color},0.32)`,
                                        fontWeight: 600, fontSize: '0.73rem',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        '&:hover': { bgcolor: `rgba(${t.color},0.28)`, transform: 'translateY(-1px)' },
                                    }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    {/* Footer */}
                    <Typography sx={{
                        mt: 3, textAlign: 'center', fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.25)', fontWeight: 500,
                    }}>
                        VUS © 2026 — Hệ Thống Quản Lý Sinh Viên
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}

export default Login;
