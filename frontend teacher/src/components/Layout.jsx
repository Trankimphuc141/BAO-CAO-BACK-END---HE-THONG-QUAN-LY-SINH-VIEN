import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
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
    KeyboardArrowRight
} from '@mui/icons-material';

const drawerWidth = 268;

const GRAD_BG = 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';

function Layout(props) {
    const { window } = props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleMenu = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleLogout = () => { dispatch(logout()); navigate('/login'); };

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/', exact: true },
        { text: 'Sinh Viên', icon: <PeopleIcon />, path: '/students' },
        { text: 'Nhập Điểm', icon: <GradeIcon />, path: '/grades' },
        { text: 'Điểm Danh', icon: <AttendanceIcon />, path: '/attendance/mark' },
        { text: 'Điểm Danh QR', icon: <QrIcon />, path: '/attendance/qr' },
        { text: 'Thông Báo', icon: <NotificationIcon />, path: '/notifications' },
        { text: 'Hồ Sơ', icon: <ProfileIcon />, path: '/profile' },
    ];

    // Chỉ hiện menu quản trị cho admin
    const adminItems = user?.role === 'admin' ? [
        { text: 'Quản Trị', icon: <AdminIcon />, path: '/admin', adminOnly: true },
    ] : [];

    const isActive = (item) => {
        if (item.exact) return location.pathname === item.path;
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
                                    color: active ? '#818cf8' : 'rgba(255,255,255,0.45)',
                                    transition: 'color 0.2s'
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: active ? 700 : 500,
                                        fontSize: '0.875rem',
                                        color: active ? 'white' : 'rgba(255,255,255,0.6)'
                                    }}
                                />
                                {active && <KeyboardArrowRight sx={{ color: '#818cf8', fontSize: 18 }} />}
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
                                        <ListItemIcon sx={{ minWidth: 38, color: active ? '#f87171' : 'rgba(239,68,68,0.55)', transition: 'color 0.2s' }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '0.875rem', color: active ? '#fca5a5' : 'rgba(239,68,68,0.65)' }}
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
                    <ListItemIcon sx={{ minWidth: 38, color: 'rgba(239,68,68,0.7)' }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText
                        primary="Đăng xuất"
                        primaryTypographyProps={{ fontSize: '0.875rem', color: 'rgba(239,68,68,0.7)', fontWeight: 600 }}
                    />
                </ListItemButton>
            </Box>
        </Box>
    );

    const container = window !== undefined ? () => window().document.body : undefined;

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
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    overflowX: 'hidden',
                    maxWidth: '100%'
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}

export default Layout;
