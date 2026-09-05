import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, TextField, Button, Grid,
    MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Avatar, Chip, InputAdornment, Stack, Tooltip, Fade, alpha
} from '@mui/material';
import {
    Search as SearchIcon, Add as AddIcon, Visibility as ViewIcon,
    Edit as EditIcon, Delete as DeleteIcon, FileDownload as DownloadIcon,
    FilterList as FilterIcon, School as SchoolIcon, PersonOff, Group
} from '@mui/icons-material';

const STATUS_COLORS = {
    'Đang học': { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
    'Bảo lưu': { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
    'Đình chỉ': { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    'Tốt nghiệp': { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
};

const defaultForm = {
    code: '', name: '', email: '', password: '123456', phone: '',
    classCode: '', academicYear: '2023-2027', status: 'Đang học',
    dateOfBirth: '', gender: 'Nam', major: 'Kỹ thuật phần mềm',
    department: 'Công nghệ thông tin'
};

function StudentList() {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [formData, setFormData] = useState(defaultForm);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => { fetchStudents(); }, [page, rowsPerPage, classFilter, statusFilter]);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/teacher/students', {
                params: { page: page + 1, limit: rowsPerPage, search, classCode: classFilter, status: statusFilter }
            });
            if (res.data.success) { setStudents(res.data.data); setTotal(res.data.total); }
        } catch (err) { console.error(err); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await axios.get('/teacher/students/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'danh_sach_sinh_vien.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) { console.error(err); }
    };

    const handleOpenAdd = () => { setFormData(defaultForm); setEditMode(false); setOpenDialog(true); };
    const handleOpenEdit = (s) => {
        setFormData({ ...defaultForm, code: s.code, name: s.name, email: s.email,
            phone: s.phone || '', classCode: s.classCode, academicYear: s.academicYear || '2023-2027',
            status: s.status, dateOfBirth: s.dateOfBirth || '', gender: s.gender || 'Nam',
            major: s.major || 'Kỹ thuật phần mềm', department: s.department || 'Công nghệ thông tin' });
        setSelectedStudentId(s._id);
        setEditMode(true);
        setOpenDialog(true);
    };

    const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            alert('Số điện thoại phải bao gồm đúng 10 chữ số.');
            return;
        }

        try {
            if (editMode) await axios.put(`/teacher/students/${selectedStudentId}`, formData);
            else await axios.post('/teacher/students', formData);
            setOpenDialog(false);
            fetchStudents();
        } catch (err) { console.error(err); }
    };

    const handleDeleteConfirmed = async () => {
        try {
            await axios.delete(`/teacher/students/${deleteConfirm._id}`);
            setDeleteConfirm(null);
            fetchStudents();
        } catch (err) { console.error(err); }
    };

    return (
        <Box sx={{ minHeight: '100vh' }}>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white',
                boxShadow: '0 20px 40px rgba(79, 70, 229, 0.3)'
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Stack direction="row" alignItems="center" gap={1.5} mb={0.5}>
                            <SchoolIcon sx={{ fontSize: 32 }} />
                            <Typography variant="h4" fontWeight={800}>Quản lý Sinh viên</Typography>
                        </Stack>
                        <Typography variant="body1" sx={{ opacity: 0.85 }}>
                            Quản lý toàn bộ hồ sơ, điểm số và điểm danh sinh viên
                        </Typography>
                    </Box>
                    <Stack direction="row" gap={2}>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportCSV}
                            sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                        >
                            Xuất CSV
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenAdd}
                            sx={{ bgcolor: 'white', color: '#4F46E5', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                        >
                            Thêm sinh viên
                        </Button>
                    </Stack>
                </Stack>

                {/* Stats */}
                <Stack direction="row" gap={3} mt={3} flexWrap="wrap">
                    {[
                        { label: 'Tổng sinh viên', value: total, icon: '👥' },
                        { label: 'Đang học', value: students.filter(s => s.status === 'Đang học').length, icon: '📚' },
                        { label: 'Bảo lưu', value: students.filter(s => s.status === 'Bảo lưu').length, icon: '⏸️' },
                    ].map(stat => (
                        <Box key={stat.label} sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, px: 3, py: 1.5, backdropFilter: 'blur(10px)' }}>
                            <Typography variant="h5" fontWeight={700}>{stat.icon} {stat.value}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>{stat.label}</Typography>
                        </Box>
                    ))}
                </Stack>
            </Box>

            {/* Filters */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5}>
                        <TextField
                            fullWidth size="small"
                            placeholder="🔍 Tìm kiếm theo Mã SV, Tên, Email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                                sx: { borderRadius: 2 }
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField select fullWidth size="small" label="Lớp" value={classFilter}
                            onChange={(e) => { setClassFilter(e.target.value); setPage(0); }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                            <MenuItem value="">Tất cả lớp</MenuItem>
                            <MenuItem value="K17-CNTT01">K17-CNTT01</MenuItem>
                            <MenuItem value="K17-AI01">K17-AI01</MenuItem>
                            <MenuItem value="K17-ATTT01">K17-ATTT01</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField select fullWidth size="small" label="Trạng thái" value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                            <MenuItem value="">Tất cả</MenuItem>
                            {Object.keys(STATUS_COLORS).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={1}>
                        <Button fullWidth variant="contained" onClick={() => { setPage(0); fetchStudents(); }} sx={{ borderRadius: 2, height: 40 }}>
                            Tìm
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.04) }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Sinh viên</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Mã SV</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>SĐT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Lớp</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Trạng thái</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {students.map((student, index) => (
                                <Fade in key={student._id} timeout={200 + index * 50}>
                                    <TableRow hover sx={{ '&:hover': { bgcolor: alpha('#4F46E5', 0.03) }, transition: 'background 0.2s' }}>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" gap={1.5}>
                                                <Avatar
                                                    src={student.avatar} alt={student.name}
                                                    sx={{ width: 40, height: 40, border: '2px solid', borderColor: alpha('#4F46E5', 0.2) }}
                                                />
                                                <Typography fontWeight={600} fontSize="0.9rem">{student.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight={700} color="primary.main" fontSize="0.85rem" sx={{ fontFamily: 'monospace' }}>{student.code}</Typography>
                                        </TableCell>
                                        <TableCell><Typography fontSize="0.85rem" color="text.secondary">{student.email}</Typography></TableCell>
                                        <TableCell><Typography fontSize="0.85rem">{student.phone || '—'}</Typography></TableCell>
                                        <TableCell>
                                            <Typography fontSize="0.85rem" fontWeight={600} sx={{
                                                bgcolor: alpha('#4F46E5', 0.08), color: '#4F46E5',
                                                px: 1.5, py: 0.5, borderRadius: 2, display: 'inline-block'
                                            }}>{student.classCode}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {student.status && STATUS_COLORS[student.status] && (
                                                <Box sx={{
                                                    display: 'inline-flex', alignItems: 'center',
                                                    bgcolor: STATUS_COLORS[student.status].bg,
                                                    color: STATUS_COLORS[student.status].color,
                                                    border: '1px solid', borderColor: STATUS_COLORS[student.status].border,
                                                    px: 1.5, py: 0.4, borderRadius: 10, fontSize: '0.75rem', fontWeight: 700
                                                }}>
                                                    {student.status}
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" justifyContent="center" gap={0.5}>
                                                <Tooltip title="Xem chi tiết" arrow>
                                                    <IconButton size="small" onClick={() => navigate(`/students/${student._id}`)}
                                                        sx={{ color: '#4F46E5', bgcolor: alpha('#4F46E5', 0.08), '&:hover': { bgcolor: alpha('#4F46E5', 0.18) } }}>
                                                        <ViewIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Chỉnh sửa" arrow>
                                                    <IconButton size="small" onClick={() => handleOpenEdit(student)}
                                                        sx={{ color: '#D97706', bgcolor: alpha('#D97706', 0.08), '&:hover': { bgcolor: alpha('#D97706', 0.18) } }}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xóa" arrow>
                                                    <IconButton size="small" onClick={() => setDeleteConfirm(student)}
                                                        sx={{ color: '#DC2626', bgcolor: alpha('#DC2626', 0.08), '&:hover': { bgcolor: alpha('#DC2626', 0.18) } }}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                </Fade>
                            ))}
                            {students.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <Stack alignItems="center" py={6} gap={2}>
                                            <Group sx={{ fontSize: 60, color: 'text.disabled' }} />
                                            <Typography color="text.secondary">Không tìm thấy sinh viên nào phù hợp.</Typography>
                                            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenAdd}>Thêm sinh viên mới</Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage="Mỗi trang:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                />
            </Paper>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <Box component="form" onSubmit={handleFormSubmit}>
                    <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
                        {editMode ? '✏️ Cập nhật thông tin sinh viên' : '➕ Thêm sinh viên mới'}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={2} sx={{ pt: 1 }}>
                            <Grid item xs={6}><TextField fullWidth size="small" label="Mã sinh viên *" name="code" required value={formData.code} onChange={handleFormChange} disabled={editMode} /></Grid>
                            <Grid item xs={6}><TextField fullWidth size="small" label="Họ và tên *" name="name" required value={formData.name} onChange={handleFormChange} /></Grid>
                            <Grid item xs={6}><TextField fullWidth size="small" label="Email *" name="email" type="email" required value={formData.email} onChange={handleFormChange} /></Grid>
                            <Grid item xs={6}><TextField fullWidth size="small" label="Số điện thoại" name="phone" value={formData.phone} onChange={handleFormChange} /></Grid>
                            {!editMode && <Grid item xs={12}><TextField fullWidth size="small" label="Mật khẩu mặc định" name="password" value={formData.password} onChange={handleFormChange} helperText="Sinh viên sẽ dùng mật khẩu này để đăng nhập lần đầu" /></Grid>}
                            <Grid item xs={6}><TextField fullWidth size="small" label="Lớp sinh hoạt *" name="classCode" required value={formData.classCode} onChange={handleFormChange} /></Grid>
                            <Grid item xs={6}><TextField fullWidth size="small" label="Khóa học" name="academicYear" value={formData.academicYear} onChange={handleFormChange} /></Grid>
                            <Grid item xs={6}>
                                <TextField select fullWidth size="small" label="Giới tính" name="gender" value={formData.gender} onChange={handleFormChange}>
                                    {['Nam', 'Nữ', 'Khác'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                                </TextField>
                            </Grid>
                            <Grid item xs={6}><TextField fullWidth size="small" label="Ngày sinh (VD: 2005-10-24)" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleFormChange} /></Grid>
                            <Grid item xs={12}><TextField fullWidth size="small" label="Ngành học" name="major" value={formData.major} onChange={handleFormChange} /></Grid>
                            <Grid item xs={12}>
                                <TextField select fullWidth size="small" label="Trạng thái học tập" name="status" value={formData.status} onChange={handleFormChange}>
                                    {Object.keys(STATUS_COLORS).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </TextField>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenDialog(false)} color="inherit">Hủy</Button>
                        <Button type="submit" variant="contained" sx={{ px: 3 }}>{editMode ? 'Lưu thay đổi' : 'Thêm mới'}</Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>⚠️ Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Typography>Bạn có chắc chắn muốn xóa sinh viên <strong>{deleteConfirm?.name}</strong> ({deleteConfirm?.code}) khỏi hệ thống? Hành động này không thể hoàn tác.</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteConfirm(null)} color="inherit">Hủy</Button>
                    <Button onClick={handleDeleteConfirmed} variant="contained" color="error">Xóa vĩnh viễn</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default StudentList;
