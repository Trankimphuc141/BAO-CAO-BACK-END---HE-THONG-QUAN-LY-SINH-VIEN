import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import {
    Box, Typography, Paper, Grid, MenuItem, TextField, Stack, Chip,
    CircularProgress, alpha, Card, CardContent, Button, List, ListItem, ListItemText
} from '@mui/material';
import {
    ArrowBack as BackIcon, TrendingUp, EmojiEvents as TrophyIcon,
    People as PeopleIcon, Grade as GradeIcon
} from '@mui/icons-material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const GRADE_COLORS_MAP = {
    A: '#059669', 'B+': '#3B82F6', B: '#60A5FA', 'C+': '#F59E0B',
    C: '#FBBF24', 'D+': '#F97316', D: '#FB923C', F: '#EF4444'
};

function ClassAnalytics() {
    const { classSectionId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [classSections, setClassSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState(classSectionId || '');

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await axios.get('/academic/class-sections');
                if (res.data.success) {
                    setClassSections(res.data.data);
                    if (!classSectionId && res.data.data.length > 0) {
                        setSelectedSection(res.data.data[0]._id);
                    }
                }
            } catch (err) { console.error(err); }
        };
        fetchMeta();
    }, []);

    useEffect(() => {
        if (selectedSection) fetchAnalytics();
    }, [selectedSection]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/teacher/analytics/${selectedSection}`);
            if (res.data.success) setData(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <Box>
            <Button startIcon={<BackIcon />} onClick={() => navigate('/grades')} sx={{ mb: 3, color: 'text.secondary' }}>
                Quay lại Quản lý Điểm
            </Button>

            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
                borderRadius: 4, p: 4, mb: 4, color: 'white', boxShadow: '0 20px 40px rgba(29,78,216,0.3)'
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
                            <TrendingUp sx={{ fontSize: 32 }} />
                            <Typography variant="h4" fontWeight={800}>Thống kê Lớp học phần</Typography>
                        </Stack>
                        <Typography sx={{ opacity: 0.8 }}>Phân tích điểm số, chuyên cần và xếp hạng sinh viên</Typography>
                    </Box>
                    <TextField
                        select size="small"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, color: 'white' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
                        label="Chọn lớp"
                    >
                        {classSections.map(sec => (
                            <MenuItem key={sec._id} value={sec._id}>{sec.sectionCode} — {sec.course?.name}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </Box>

            {loading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={50} /></Box>
            ) : !data ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Chưa có dữ liệu thống kê cho lớp này.</Typography></Paper>
            ) : (
                <Grid container spacing={3}>
                    {/* Stat Cards */}
                    {[
                        { label: 'Tổng sinh viên', value: data.stats.total, color: '#4F46E5', icon: <PeopleIcon /> },
                        { label: 'Đạt', value: data.stats.passed, color: '#059669', icon: '✅' },
                        { label: 'Rớt', value: data.stats.failed, color: '#EF4444', icon: '❌' },
                        { label: 'GPA TB (10)', value: data.stats.avgScore10, color: '#D97706', icon: <GradeIcon /> },
                        { label: 'GPA TB (4)', value: data.stats.avgScore4, color: '#7C3AED', icon: <TrophyIcon /> },
                        { label: 'Buổi học', value: data.stats.totalSessions, color: '#0891B2', icon: '📅' },
                    ].map(card => (
                        <Grid item xs={6} sm={4} md={2} key={card.label}>
                            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center', p: 1.5, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 32px ${alpha(card.color, 0.18)}` } }}>
                                <Typography fontSize="1.5rem">{typeof card.icon === 'string' ? card.icon : ''}</Typography>
                                <Typography variant="h4" fontWeight={800} sx={{ color: card.color }}>{card.value}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{card.label}</Typography>
                            </Card>
                        </Grid>
                    ))}

                    {/* Bar Chart: Phân phối điểm chữ */}
                    <Grid item xs={12} md={7}>
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: 360 }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>📊 Phân phối điểm xếp loại</Typography>
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={data.gradeDistributionArray} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip formatter={(value) => [`${value} sinh viên`, 'Số lượng']} />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                        {data.gradeDistributionArray.map((entry) => (
                                            <Cell key={entry.name} fill={GRADE_COLORS_MAP[entry.name] || '#6366F1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Pie Chart: Đạt/Rớt */}
                    <Grid item xs={12} md={5}>
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: 360 }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>🎯 Tỷ lệ Đạt/Rớt</Typography>
                            <ResponsiveContainer width="100%" height="85%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Đạt', value: data.stats.passed },
                                            { name: 'Rớt', value: data.stats.failed }
                                        ]}
                                        cx="50%" cy="50%" outerRadius={90}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        <Cell fill="#059669" />
                                        <Cell fill="#EF4444" />
                                    </Pie>
                                    <Legend />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Top Students */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>🏆 Top sinh viên xuất sắc</Typography>
                            {data.topStudents.length === 0 ? (
                                <Typography color="text.secondary">Chưa có dữ liệu</Typography>
                            ) : (
                                <List disablePadding>
                                    {data.topStudents.map((g, idx) => (
                                        <ListItem key={g._id} sx={{ px: 0, py: 0.5 }}>
                                            <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: idx === 0 ? '#F59E0B' : idx === 1 ? '#9CA3AF' : idx === 2 ? '#B45309' : '#EEF2FF', color: idx < 3 ? 'white' : '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', mr: 2 }}>
                                                {idx + 1}
                                            </Box>
                                            <ListItemText
                                                primary={g.student?.name}
                                                secondary={`MSSV: ${g.student?.code}`}
                                                primaryTypographyProps={{ fontWeight: 600 }}
                                            />
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography fontWeight={800} color="primary.main">{g.totalScore4} GPA</Typography>
                                                <Typography variant="caption" color="text.secondary">{g.totalScore10}/10</Typography>
                                            </Box>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Paper>
                    </Grid>

                    {/* Grade Distribution Table */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>📋 Chi tiết xếp loại</Typography>
                            <Stack gap={1}>
                                {data.gradeDistributionArray.map(({ name, count }) => {
                                    const pct = data.stats.total > 0 ? (count / data.stats.total * 100).toFixed(1) : 0;
                                    const color = GRADE_COLORS_MAP[name] || '#6366F1';
                                    return (
                                        <Box key={name}>
                                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                                <Typography fontWeight={700} sx={{ color }}>{name}</Typography>
                                                <Typography fontWeight={600}>{count} SV ({pct}%)</Typography>
                                            </Stack>
                                            <Box sx={{ height: 8, borderRadius: 4, bgcolor: alpha(color, 0.15), overflow: 'hidden' }}>
                                                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}

export default ClassAnalytics;
