import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import axios from '../utils/axiosConfig';
import { io } from 'socket.io-client';
import {
    AppBar, Box, CssBaseline, Divider, Drawer, IconButton, List,
    ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar,
    Typography, Avatar, Menu, MenuItem, Badge, Tooltip, alpha, Chip
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    ExitToApp as LogoutIcon,
    AccountCircle,
    AssignmentTurnedIn as AttendanceIcon,
    Grade as GradeIcon,
    QrCode as QrIcon,
    Notifications as NotificationIcon,
    Analytics as AnalyticsIcon,
    AdminPanelSettings as AdminIcon,
    Person as ProfileIcon,
    KeyboardArrowRight,
    School as ThesisIcon,
    CalendarMonth as CalendarIcon,
    HistoryEdu as AppealIcon,
    Close as CloseIcon
} from '@mui/icons-material';

const drawerWidth = 268;

const GRAD_BG = 'linear-gradient(160deg, #312e81 0%, #3730a3 40%, #4338ca 100%)';

const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.12);
        gain2.gain.setValueAtTime(0.25, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.5);
    } catch {
        // audio policy ignored
    }
};

function Layout(props) {
    const { window: windowProp } = props;
    const container = windowProp !== undefined ? () => windowProp().document.body : undefined;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [pendingAppealsCount, setPendingAppealsCount] = useState(0);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [realtimeNotif, setRealtimeNotif] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleMenu = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleLogout = () => { dispatch(logout()); navigate('/login'); };

    const fetchPendingAppeals = useCallback(async () => {
        try {
            const res = await axios.get('/teacher/appeals');
            if (res.data.success && Array.isArray(res.data.data)) {
                const count = res.data.data.filter(a => ['pending_teacher', 'teacher_request_unlock', 'admin_unlocked', 'teacher_re_submitted'].includes(a.status)).length;
                setPendingAppealsCount(count);
            }
        } catch {
            // ignore
        }
    }, []);

    const fetchUnreadNotifications = useCallback(async () => {
        try {
            const res = await axios.get('/teacher/notifications');
            if (res.data.success) {
                setUnreadNotifCount(res.data.unreadCount || 0);
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        fetchPendingAppeals();
        fetchUnreadNotifications();
        const interval = setInterval(() => {
            fetchPendingAppeals();
            fetchUnreadNotifications();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchPendingAppeals, fetchUnreadNotifications]);

    // Lắng nghe sự kiện cập nhật thông báo cục bộ (khi đọc xong thông báo)
    useEffect(() => {
        const handleNotifUpdate = () => {
            fetchUnreadNotifications();
        };
        window.addEventListener('teacher-notifications-updated', handleNotifUpdate);
        return () => window.removeEventListener('teacher-notifications-updated', handleNotifUpdate);
    }, [fetchUnreadNotifications]);

    // Tự đóng toast sau 6 giây
    useEffect(() => {
        if (!realtimeNotif) return;
        const timer = setTimeout(() => setRealtimeNotif(null), 6000);
        return () => clearTimeout(timer);
    }, [realtimeNotif]);

    // Socket realtime listener cho Giảng Viên
    useEffect(() => {
        if (!user) return;
        const userId = user._id || user.id;
        const socketUrl = window.location.hostname === '127.0.0.1' 
            ? 'http://127.0.0.1:5000' 
            : 'http://localhost:5000';

        const socket = io(socketUrl, {
            transports: ['websocket', 'polling']
        });

        const emitJoin = () => {
            socket.emit('join-room', { userId, role: user.role || 'teacher' });
            socket.emit('join', { userId, role: user.role || 'teacher' });
        };

        socket.on('connect', () => {
            console.log('🔌 [Teacher] Socket connected:', socket.id);
            emitJoin();
        });
        emitJoin();

        const handleNewNotification = (data) => {
            console.log('🔔 [Teacher] New notification received:', data);
            playNotificationSound();
            setRealtimeNotif(data);
            fetchPendingAppeals();
            fetchUnreadNotifications();
        };

        const handleNewAppeal = (data) => {
            console.log('📝 [Teacher] New appeal received:', data);
            playNotificationSound();
            setRealtimeNotif({
                type: 'appeal',
                title: '📝 Đơn phúc khảo mới',
                content: `SV ${data.studentName || 'Sinh viên'} (${data.studentCode || ''}) nộp đơn phúc khảo môn ${data.courseName || ''}`,
                link: '/grades?view=appeals'
            });
            fetchPendingAppeals();
            fetchUnreadNotifications();
        };

        socket.on('new-notification', handleNewNotification);
        socket.on('new-appeal', handleNewAppeal);

        return () => {
            socket.off('new-notification', handleNewNotification);
            socket.off('new-appeal', handleNewAppeal);
            socket.disconnect();
        };
    }, [user, fetchPendingAppeals, fetchUnreadNotifications]);

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/', exact: true },
        { text: 'Thời Khóa Biểu Dạy', icon: <CalendarIcon />, path: '/schedule' },
        { text: 'Sinh Viên', icon: <PeopleIcon />, path: '/students' },
        { text: 'Đồ Án / Luận Văn', icon: <ThesisIcon />, path: '/thesis' },
        { text: 'Nhập Điểm', icon: <GradeIcon />, path: '/grades' },
        { text: 'Đơn Phúc Khảo', icon: <AppealIcon />, path: '/grades?view=appeals', badge: pendingAppealsCount },
        { text: 'Điểm Danh', icon: <AttendanceIcon />, path: '/attendance/mark' },
        { text: 'Điểm Danh QR', icon: <QrIcon />, path: '/attendance/qr' },
        { text: 'Thông Báo', icon: <NotificationIcon />, path: '/notifications', badge: unreadNotifCount },
        { text: 'Hồ Sơ', icon: <ProfileIcon />, path: '/profile' },
    ];

    // Chỉ hiện menu quản trị cho admin
    const adminItems = user?.role === 'admin' ? [
        { text: 'Quản Trị', icon: <AdminIcon />, path: '/admin', adminOnly: true },
    ] : [];

    const isActive = (item) => {
        if (item.exact) return location.pathname === item.path;
        if (item.path.includes('?')) {
            return location.pathname + location.search === item.path;
        }
        return location.pathname.startsWith(item.path);
    };

    const drawer = (
        <Box sx={{ height: '100%', background: GRAD_BG, display: 'flex', flexDirection: 'column' }}>
            {/* Logo header */}
            <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <img src="/vus_logo.png" alt="VUS" style={{
                    width: 48, height: 36, objectFit: 'contain', flexShrink: 0,
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5)) brightness(1.05)'
                }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>
                        VUS
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.67rem', letterSpacing: '0.05em' }}>
                        Cổng Giảng Viên
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

            {/* User info */}
            <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                    src={user?.avatar}
                    alt={user?.name}
                    sx={{ width: 40, height: 40, border: '2px solid rgba(79,70,229,0.5)' }}
                />
                <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
                        {user?.name || 'Giảng Viên'}
                    </Typography>
                    <Chip
                        label={user?.role === 'admin' ? 'Admin' : 'Giảng Viên'}
                        size="small"
                        sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(79,70,229,0.3)', color: '#a5b4fc', fontWeight: 700 }}
                    />
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 2, mb: 1 }} />

            {/* Nav items */}
            <List sx={{ px: 1.5, flex: 1 }}>
                {menuItems.map((item) => {
                    const active = isActive(item);
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                                sx={{
                                    borderRadius: '12px',
                                    px: 2, py: 1.2,
                                    bgcolor: active ? 'rgba(79,70,229,0.25)' : 'transparent',
                                    border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        bgcolor: active ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.06)',
                                        transform: 'translateX(2px)',
                                    }
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: 38,
                                    color: active ? '#a5b4fc' : '#ffffff',
                                    transition: 'color 0.2s'
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        sx: {
                                            fontWeight: active ? 700 : 600,
                                            fontSize: '0.9rem',
                                            color: '#ffffff',
                                            letterSpacing: '0.01em',
                                            textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                                        }
                                    }}
                                />
                                {item.badge > 0 && (
                                    <Chip
                                        size="small"
                                        label={item.badge}
                                        color="error"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            mr: active ? 0.5 : 0
                                        }}
                                    />
                                )}
                                {active && <KeyboardArrowRight sx={{ color: '#ffffff', fontSize: 18 }} />}
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Admin-only section */}
            {adminItems.length > 0 && (
                <>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 2, mb: 0.5 }} />
                    <Typography variant="caption" sx={{ px: 3, pb: 0.5, color: 'rgba(255,255,255,0.28)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Quản Trị
                    </Typography>
                    <List sx={{ px: 1.5 }}>
                        {adminItems.map((item) => {
                            const active = isActive(item);
                            return (
                                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                                        sx={{
                                            borderRadius: '12px',
                                            px: 2, py: 1.2,
                                            bgcolor: active ? 'rgba(239,68,68,0.2)' : 'transparent',
                                            border: active ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: 'rgba(239,68,68,0.12)',
                                                transform: 'translateX(2px)',
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 38, color: active ? '#f87171' : '#f87171', transition: 'color 0.2s' }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{
                                                sx: {
                                                    fontWeight: 600,
                                                    fontSize: '0.9rem',
                                                    color: '#ffffff',
                                                    letterSpacing: '0.01em',
                                                    textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                                                }
                                            }}
                                        />
                                        {active && <KeyboardArrowRight sx={{ color: '#f87171', fontSize: 18 }} />}
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                </>
            )}

            {/* Bottom logout */}
            <Box sx={{ px: 1.5, pb: 2 }}>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 1 }} />
                <ListItemButton
                    onClick={handleLogout}
                    sx={{
                        borderRadius: '12px', px: 2, py: 1.2,
                        '&:hover': { bgcolor: 'rgba(239,68,68,0.15)' }
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 38, color: '#f87171' }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText
                        primary="Đăng xuất"
                        primaryTypographyProps={{
                            sx: {
                                fontSize: '0.9rem',
                                color: '#fca5a5',
                                fontWeight: 700,
                                letterSpacing: '0.01em',
                                textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                            }
                        }}
                    />
                </ListItemButton>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <Toolbar sx={{ gap: 2 }}>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    {/* Breadcrumb / page title could go here */}
                    <Box sx={{ flexGrow: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* Nút chuông thông báo hiển thị số thông báo chưa đọc */}
                        <Tooltip title={`Thông báo (${unreadNotifCount} chưa đọc)`}>
                            <IconButton onClick={() => navigate('/notifications')} sx={{ color: '#0891b2' }}>
                                <Badge badgeContent={unreadNotifCount} color="error" max={99}>
                                    <NotificationIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        {/* Nút đơn phúc khảo */}
                        <Tooltip title={`Đơn phúc khảo cần xử lý (${pendingAppealsCount})`}>
                            <IconButton onClick={() => navigate('/grades?view=appeals')} sx={{ color: '#4f46e5' }}>
                                <Badge badgeContent={pendingAppealsCount} color="warning" max={99}>
                                    <AppealIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <Typography variant="body2" fontWeight={600} sx={{ display: { xs: 'none', sm: 'block' } }}>
                            {user?.name || 'Giảng Viên'}
                        </Typography>
                        <Tooltip title="Tùy chọn tài khoản">
                            <IconButton onClick={handleMenu} size="small">
                                <Avatar src={user?.avatar} alt={user?.name} sx={{ width: 34, height: 34 }} />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            anchorEl={anchorEl}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            keepMounted
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                            PaperProps={{ elevation: 4, sx: { mt: 1, minWidth: 180, borderRadius: 2 } }}
                        >
                            <MenuItem onClick={() => { handleClose(); navigate('/profile'); }} sx={{ gap: 1.5 }}>
                                <AccountCircle fontSize="small" /> Hồ sơ
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleLogout} sx={{ color: 'error.main', gap: 1.5 }}>
                                <LogoutIcon fontSize="small" color="error" /> Đăng xuất
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer
                    container={container}
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none', boxShadow: '4px 0 20px rgba(0,0,0,0.15)' },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    pt: { xs: 10, sm: 11 }, // Clean spacing under fixed AppBar
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    overflowX: 'hidden',
                    maxWidth: '100%'
                }}
            >
                <Outlet />
            </Box>

            {/* Realtime Notification Popup Toast */}
            {realtimeNotif && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 24,
                        right: 24,
                        zIndex: 99999,
                        minWidth: 320,
                        maxWidth: 400,
                        bgcolor: 'rgba(30, 27, 75, 0.96)',
                        backdropFilter: 'blur(16px)',
                        color: 'white',
                        p: 2.2,
                        borderRadius: 3,
                        boxShadow: '0 20px 40px -5px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(129,140,248,0.5)',
                        animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 24px 45px -5px rgba(0,0,0,0.6), 0 0 0 2px rgba(165,180,252,0.8)'
                        },
                        '@keyframes slideInRight': {
                            from: { transform: 'translateX(120%)', opacity: 0 },
                            to: { transform: 'translateX(0)', opacity: 1 }
                        }
                    }}
                    onClick={() => {
                        if (realtimeNotif.link) navigate(realtimeNotif.link);
                        setRealtimeNotif(null);
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: 'rgba(99, 102, 241, 0.25)',
                            border: '1.5px solid rgba(129, 140, 248, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#a5b4fc',
                            flexShrink: 0
                        }}>
                            <NotificationIcon sx={{ fontSize: 22 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="caption" sx={{
                                    textTransform: 'uppercase',
                                    fontWeight: 800,
                                    fontSize: '0.68rem',
                                    color: '#818cf8',
                                    letterSpacing: '0.06em'
                                }}>
                                    🔔 Thông Báo Mới
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setRealtimeNotif(null);
                                    }}
                                    sx={{ color: 'rgba(255,255,255,0.4)', p: 0.25, '&:hover': { color: 'white' } }}
                                >
                                    <CloseIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', mb: 0.5, lineHeight: 1.3 }}>
                                {realtimeNotif.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                {realtimeNotif.content}
                            </Typography>
                            <Box sx={{ mt: 1.2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Chip
                                    label="Xem chi tiết →"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(99, 102, 241, 0.35)',
                                        color: '#c7d2fe',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        height: 24,
                                        border: '1px solid rgba(129, 140, 248, 0.4)',
                                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.6)' }
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
}

export default Layout;
