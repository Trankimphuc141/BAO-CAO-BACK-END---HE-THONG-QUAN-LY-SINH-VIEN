import { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import {
    Box, Typography, Paper, Chip, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    Stack, Alert, CircularProgress, Divider, Avatar, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    Select, FormControl, InputLabel, Tooltip, alpha,
} from "@mui/material";
import {
    School as ThesisIcon,
    CheckCircle as ApproveIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Download as DownloadIcon,
    InsertDriveFile as FileIcon,
    CloudDownload as CloudDownloadIcon,
    OpenInNew as ExternalLinkIcon,
    AccessTime as TimeIcon,
} from "@mui/icons-material";

const MILESTONE_STATUS = [
    { value: "Chưa nộp", label: "Chưa nộp", color: "#6b7280" },
    { value: "Đã nộp", label: "Đã nộp", color: "#3b82f6" },
    { value: "Đang duyệt", label: "Đang duyệt", color: "#f59e0b" },
    { value: "Đã duyệt", label: "Đã duyệt", color: "#10b981" },
    { value: "Yêu cầu sửa", label: "Yêu cầu chỉnh sửa", color: "#ef4444" },
];

const msColor = (status) => {
    const map = {
        "Chưa nộp": "#6b7280", "Chua nop": "#6b7280",
        "Đã nộp": "#3b82f6", "Da nop": "#3b82f6",
        "Đang duyệt": "#f59e0b", "Dang duyet": "#f59e0b",
        "Đã duyệt": "#10b981", "Da duyet": "#10b981",
        "Yêu cầu sửa": "#ef4444", "Yêu cầu chỉnh sửa": "#ef4444", "Yeu cau chinh sua": "#ef4444",
    };
    return map[status] || "#6b7280";
};

const getDownloadUrl = (thesisId, fileIndex) => (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/theses/download/' + thesisId + (fileIndex !== undefined ? `?fileIndex=${fileIndex}` : '');
const getMilestoneDownloadUrl = (thesisId, mIdx, fileIndex) => (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/theses/download/' + thesisId + '/milestone/' + mIdx + (fileIndex !== undefined ? `?fileIndex=${fileIndex}` : '');

const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDateTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function ThesisManagement() {
    const [theses, setTheses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [selected, setSelected] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadTheses(); }, []);

    const loadTheses = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/theses");
            if (res.data.success) setTheses(res.data.data || []);
        } catch (err) {
            setAlert({ type: "error", msg: "Không thể tải danh sách đồ án: " + (err.message || "") });
        } finally { setLoading(false); }
    };

    const openDetail = (thesis) => { setSelected(thesis); setEditingMilestone(null); setDialogOpen(true); };

    const startEdit = (mIdx) => {
        const m = selected.milestones[mIdx];
        setEditingMilestone({ milestoneIndex: mIdx, status: m.status || "Đã nộp", score: m.score ?? "", comment: m.comment || "" });
    };

    const saveMilestone = async () => {
        if (!selected || editingMilestone === null) return;
        setSaving(true);
        try {
            const res = await axios.put(`/theses/${selected._id}`, {
                milestoneIndex: editingMilestone.milestoneIndex,
                status: editingMilestone.status,
                score: editingMilestone.score !== "" ? Number(editingMilestone.score) : null,
                comment: editingMilestone.comment,
            });
            if (res.data.success) {
                setAlert({ type: "success", msg: "Cập nhật mốc tiến độ thành công!" });
                setEditingMilestone(null);
                setDialogOpen(false);
                loadTheses();
            } else {
                setAlert({ type: "error", msg: res.data.message });
            }
        } catch (err) {
            setAlert({ type: "error", msg: err.message });
        } finally { setSaving(false); }
    };

    const total = theses.length;
    const inProgress = theses.filter(t => t.status === "Đang thực hiện" || t.status === "Dang thuc hien").length;
    const done = theses.filter(t => t.status === "Đã bảo vệ" || t.status === "Hoàn thành" || t.status === "Hoan thanh").length;
    const pending = theses.filter(t => t.milestones?.some(m => m.status === "Đã nộp" || m.status === "Da nop" || m.status === "Đang duyệt")).length;

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                mb: 4,
                p: { xs: 2.5, sm: 3.5 },
                borderRadius: 4,
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                color: "white",
                boxShadow: "0 16px 36px rgba(79, 70, 229, 0.25)"
            }}>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
                    <ThesisIcon sx={{ fontSize: { xs: 28, sm: 34 } }} />
                    <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.1rem' }, letterSpacing: '-0.02em' }}>
                        Quản Lý Đồ Án / Luận Văn
                    </Typography>
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.88rem', sm: '0.98rem' } }}>
                    Theo dõi tiến độ, kiểm tra file nộp qua Google Drive và phê duyệt mốc nộp bài của sinh viên
                </Typography>
            </Box>

            {alert && (<Alert severity={alert.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>)}

            {/* Stats Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 2.5,
                mb: 4,
                width: '100%'
            }}>
                {[
                    { label: "Tổng đồ án", value: total, color: "#4f46e5", icon: "📚" },
                    { label: "Đang thực hiện", value: inProgress, color: "#3b82f6", icon: "⚙️" },
                    { label: "Hoàn thành", value: done, color: "#10b981", icon: "✅" },
                    { label: "Chờ kiểm duyệt", value: pending, color: "#f59e0b", icon: "⏳" },
                ].map(stat => (
                    <Paper
                        key={stat.label}
                        elevation={0}
                        sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 3,
                            textAlign: "center",
                            p: { xs: 2, sm: 2.5 },
                            transition: "all 0.25s ease",
                            '&:hover': {
                                transform: "translateY(-3px)",
                                boxShadow: "0 10px 25px -4px rgba(0, 0, 0, 0.08)",
                                borderColor: stat.color
                            }
                        }}
                    >
                        <Typography fontSize="2rem" mb={0.5}>{stat.icon}</Typography>
                        <Typography fontWeight={800} fontSize="1.85rem" sx={{ color: stat.color, lineHeight: 1.2 }}>{stat.value}</Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} mt={0.5}>{stat.label}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* Table */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                <Box sx={{ px: 3, py: 2.25, borderBottom: "1px solid", borderColor: "divider", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Danh sách đồ án tốt nghiệp</Typography>
                    <Chip label={`${total} đề tài`} size="small" sx={{ fontWeight: 600, bgcolor: alpha('#4f46e5', 0.08), color: '#4f46e5' }} />
                </Box>
                {loading ? (
                    <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress size={40} /><Typography mt={2} color="text.secondary">Đang tải dữ liệu...</Typography></Box>
                ) : theses.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: "center", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ p: 2, bgcolor: alpha('#4f46e5', 0.08), borderRadius: '50%', color: '#4f46e5', mb: 1.5 }}>
                            <ThesisIcon sx={{ fontSize: 48 }} />
                        </Box>
                        <Typography variant="h6" fontWeight={700} color="text.primary">Chưa có đồ án nào</Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>Hiện tại chưa có sinh viên nào đăng ký đề tài hoặc đồ án tốt nghiệp.</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha("#4f46e5", 0.04) }}>
                                    {["Sinh viên", "Mã đề tài", "Tên đề tài", "File Đồ Án", "Thời gian nộp đồ án", "Trạng thái", "Các mốc tiến độ", "Thao tác"].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "text.secondary", whiteSpace: "nowrap" }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {theses.map(t => (
                                    <TableRow key={t._id} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1.2}>
                                                <Avatar src={t.student?.avatar} sx={{ width: 32, height: 32, fontSize: "0.75rem" }}>{t.student?.name?.[0]}</Avatar>
                                                <Box>
                                                    <Typography fontWeight={600} fontSize="0.82rem">{t.student?.name || "N/A"}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{t.student?.code}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell><Typography fontFamily="monospace" fontSize="0.78rem" color="primary.main" fontWeight={600}>{t.topicCode}</Typography></TableCell>
                                        <TableCell sx={{ maxWidth: 200 }}>
                                            <Typography fontSize="0.83rem" fontWeight={500} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topicTitle}</Typography>
                                        </TableCell>
                                        
                                        {/* File Đồ Án & Download */}
                                        <TableCell sx={{ minWidth: 160 }}>
                                            {(() => {
                                                const fileList = (t.files && t.files.length > 0)
                                                    ? t.files
                                                    : (t.submittedFileName || t.submittedFileUrl ? [{ fileName: t.submittedFileName, fileSize: t.submittedFileSize }] : []);
                                                
                                                if (fileList.length === 0) {
                                                    return <Typography variant="caption" color="text.secondary">Chưa nộp file</Typography>;
                                                }

                                                return (
                                                    <Stack direction="column" spacing={0.75}>
                                                        <Typography variant="caption" fontWeight={700} color="#4f46e5">
                                                            📁 {fileList.length} file đã nộp:
                                                        </Typography>
                                                        {fileList.map((f, fIdx) => (
                                                            <Stack key={fIdx} direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: alpha("#4f46e5", 0.05), p: 0.5, borderRadius: 1 }}>
                                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                                    <Typography fontSize="0.75rem" fontWeight={600} noWrap sx={{ maxWidth: 120 }} title={f.fileName}>
                                                                        📄 {f.fileName || `File #${fIdx + 1}`}
                                                                    </Typography>
                                                                    {f.fileSize ? (
                                                                        <Typography variant="caption" color="text.secondary" fontSize="0.68rem">
                                                                            {formatFileSize(f.fileSize)}
                                                                        </Typography>
                                                                    ) : null}
                                                                </Box>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={<DownloadIcon sx={{ fontSize: 12 }} />}
                                                                    href={getDownloadUrl(t._id, fIdx)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    sx={{
                                                                        fontSize: "0.68rem",
                                                                        py: 0.1,
                                                                        px: 0.6,
                                                                        borderRadius: 1,
                                                                        textTransform: "none",
                                                                        whiteSpace: "nowrap",
                                                                        borderColor: "#4f46e5",
                                                                        color: "#4f46e5",
                                                                        minWidth: "auto"
                                                                    }}
                                                                >
                                                                    Tải
                                                                </Button>
                                                            </Stack>
                                                        ))}
                                                    </Stack>
                                                );
                                            })()}
                                        </TableCell>

                                        {/* Cột thời gian nộp đồ án với thời gian thực tế sinh viên nộp */}
                                        <TableCell sx={{ minWidth: 155, whiteSpace: "nowrap" }}>
                                            {(() => {
                                                const actualTime = t.submittedAt || (t.milestones && t.milestones.filter(m => m.submittedAt).slice(-1)[0]?.submittedAt) || (t.submittedFileName ? t.createdAt : null);
                                                if (actualTime) {
                                                    return (
                                                        <Stack spacing={0.3}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                                                <TimeIcon sx={{ fontSize: 15, color: '#059669' }} />
                                                                <Typography fontSize="0.78rem" fontWeight={700} sx={{ color: '#059669' }}>
                                                                    {formatDateTime(actualTime)}
                                                                </Typography>
                                                            </Box>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                                                                Thời gian nộp thực tế
                                                            </Typography>
                                                        </Stack>
                                                    );
                                                }
                                                return (
                                                    <Chip label="Chưa nộp" size="small" sx={{ fontSize: '0.68rem', height: 22, color: 'text.secondary', bgcolor: alpha('#94a3b8', 0.12) }} />
                                                );
                                            })()}
                                        </TableCell>

                                        <TableCell>
                                            <Chip label={t.status} size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
                                        </TableCell>
                                        {/* Hiển thị động theo số mốc thực tế */}
                                        <TableCell sx={{ minWidth: 220 }}>
                                            {t.milestones && t.milestones.length > 0 ? (
                                                <Stack spacing={0.5}>
                                                    {t.milestones.map((m, i) => (
                                                        <Tooltip
                                                            key={i}
                                                            title={`${m.name} — ${m.status}${m.submittedAt ? ` | Nộp lúc: ${formatDateTime(m.submittedAt)}` : ''}${m.submittedFileName ? ` | ${m.submittedFileName}` : ''}`}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <Chip
                                                                    label={`M${i + 1}`}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 20, fontSize: '0.68rem', fontWeight: 700,
                                                                        bgcolor: alpha(msColor(m.status), 0.12),
                                                                        color: msColor(m.status),
                                                                        border: `1px solid ${alpha(msColor(m.status), 0.3)}`
                                                                    }}
                                                                />
                                                                <Typography variant="caption" noWrap sx={{ maxWidth: 80, fontSize: '0.68rem', color: 'text.secondary' }}>
                                                                    {m.submittedAt ? formatDateTime(m.submittedAt) : '—'}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    ))}
                                                </Stack>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">Chưa có mốc</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button size="small" variant="contained" startIcon={<ViewIcon fontSize="small" />} onClick={() => openDetail(t)}
                                                sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.75rem", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "none" }}>
                                                Duyệt & Tải
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Detail & Review Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <ThesisIcon color="primary" />
                        <Box>
                            <Typography fontWeight={800} fontSize="1.05rem">{selected?.topicTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{selected?.topicCode} — Sinh viên: {selected?.student?.name}</Typography>
                        </Box>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selected && (
                        <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Sinh viên</Typography>
                                    <Typography fontWeight={700}>{selected.student?.name} ({selected.student?.code})</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Giảng viên hướng dẫn</Typography>
                                    <Typography fontWeight={700}>{selected.advisor?.name || "Chưa phân công"}</Typography>
                                </Box>
                                <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Mô tả đề tài</Typography>
                                    <Typography fontSize="0.88rem" color="text.secondary">{selected.description || "Chưa có mô tả"}</Typography>
                                </Box>

                                {/* Danh sách các file đồ án của sinh viên */}
                                {(() => {
                                    const fileList = (selected.files && selected.files.length > 0)
                                        ? selected.files
                                        : (selected.submittedFileName || selected.submittedFileUrl ? [{
                                            fileName: selected.submittedFileName,
                                            fileSize: selected.submittedFileSize,
                                            driveWebViewLink: selected.driveWebViewLink
                                        }] : []);

                                    if (fileList.length === 0) return null;

                                    return (
                                        <Box sx={{ gridColumn: { sm: 'span 2' }, p: 2, bgcolor: alpha('#4f46e5', 0.05), borderRadius: 2, border: '1px solid', borderColor: alpha('#4f46e5', 0.2) }}>
                                            <Typography fontWeight={700} fontSize="0.95rem" color="#3730a3" mb={1.5} display="flex" alignItems="center" gap={1}>
                                                📁 Danh sách file đồ án đã nộp ({fileList.length} file):
                                            </Typography>
                                            <Stack spacing={1}>
                                                {fileList.map((file, fIdx) => (
                                                    <Paper key={fIdx} elevation={0} sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1.5, border: '1px solid', borderColor: alpha('#4f46e5', 0.15) }}>
                                                        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                                <Box sx={{ p: 1, bgcolor: '#4f46e5', color: 'white', borderRadius: 1.5, display: 'flex' }}>
                                                                    <FileIcon />
                                                                </Box>
                                                                <Box>
                                                                    <Typography fontWeight={700} fontSize="0.88rem" color="text.primary">
                                                                        {file.fileName || `File #${fIdx + 1}`}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {file.fileSize ? `Dung lượng: ${formatFileSize(file.fileSize)} • ` : ''}
                                                                        Lưu trữ: Google Drive & Server
                                                                        {file.submittedAt ? ` • Nộp lúc: ${formatDateTime(file.submittedAt)}` : ''}
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                            <Stack direction="row" spacing={1}>
                                                                {file.driveWebViewLink && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        startIcon={<ExternalLinkIcon fontSize="small" />}
                                                                        href={file.driveWebViewLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.78rem' }}
                                                                    >
                                                                        Google Drive
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    startIcon={<CloudDownloadIcon fontSize="small" />}
                                                                    href={getDownloadUrl(selected._id, fIdx)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    sx={{
                                                                        textTransform: 'none',
                                                                        borderRadius: 1.5,
                                                                        fontSize: '0.78rem',
                                                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                                                                    }}
                                                                >
                                                                    Tải về máy
                                                                </Button>
                                                            </Stack>
                                                        </Stack>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </Box>
                                    );
                                })()}
                            </Box>
                            
                            <Divider sx={{ mb: 3 }} />
                            <Typography fontWeight={700} mb={2}>Các mốc tiến độ ({selected.milestones?.length || 0} mốc)</Typography>
                            <Stack spacing={2}>
                                {(selected.milestones || []).map((m, idx) => (
                                    <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: alpha(msColor(m.status), 0.4) }}>
                                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
                                            <Box flex={1}>
                                                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                                    <Typography fontWeight={700} fontSize="0.88rem">M{idx + 1}: {m.name}</Typography>
                                                    <Chip label={m.status} size="small" sx={{ fontWeight: 700, fontSize: "0.68rem", bgcolor: alpha(msColor(m.status), 0.12), color: msColor(m.status) }} />
                                                </Stack>
                                                {/* Thời gian nộp thực tế */}
                                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                                    {m.submittedAt ? (
                                                        <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                                                             ⏱ Nộp thực tế: {formatDateTime(m.submittedAt)}
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="caption" color="text.disabled">Chưa nộp</Typography>
                                                    )}
                                                    {m.score != null && (
                                                        <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 600 }}>🎯 Điểm: {m.score}</Typography>
                                                    )}
                                                </Stack>
                                                
                                                {/* File nộp của mốc */}
                                                {(() => {
                                                    const mFiles = (m.files && m.files.length > 0)
                                                        ? m.files
                                                        : (m.submittedFileName ? [{ fileName: m.submittedFileName, fileSize: m.submittedFileSize }] : []);
                                                    
                                                    if (mFiles.length === 0) return null;

                                                    return (
                                                        <Stack spacing={0.5} mt={1}>
                                                            <Typography variant="caption" fontWeight={700} color="primary.main">
                                                                📎 File đính kèm mốc ({mFiles.length} file):
                                                            </Typography>
                                                            {mFiles.map((mf, mfIdx) => (
                                                                <Box key={mfIdx} display="flex" alignItems="center" gap={1} sx={{ bgcolor: alpha('#4f46e5', 0.04), p: 0.5, px: 1, borderRadius: 1 }}>
                                                                    <Typography fontSize="0.78rem" color="primary.main" fontWeight={600} noWrap sx={{ maxWidth: 220 }} title={mf.fileName}>
                                                                        📄 {mf.fileName || `File #${mfIdx + 1}`} {mf.fileSize ? `(${formatFileSize(mf.fileSize)})` : ''}
                                                                    </Typography>
                                                                    <Button
                                                                        size="small"
                                                                        variant="text"
                                                                        startIcon={<DownloadIcon sx={{ fontSize: 13 }} />}
                                                                        href={getMilestoneDownloadUrl(selected._id, idx, mfIdx)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        sx={{ fontSize: "0.72rem", py: 0, textTransform: "none" }}
                                                                    >
                                                                        Tải file
                                                                    </Button>
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    );
                                                })()}

                                                {(m.studentNote || m.note) && (
                                                    <Typography fontSize="0.82rem" sx={{ color: '#4338ca', bgcolor: alpha('#4f46e5', 0.08), p: 0.75, borderRadius: 1, mt: 0.75 }}>
                                                        📝 <strong>Ghi chú sinh viên:</strong> {m.studentNote || m.note}
                                                    </Typography>
                                                )}

                                                {m.comment && <Typography fontSize="0.82rem" color="text.secondary" mt={0.5}>💬 GV nhận xét: {m.comment}</Typography>}
                                            </Box>
                                            {editingMilestone?.milestoneIndex === idx ? (
                                                <Chip label="Đang sửa..." size="small" color="warning" />
                                            ) : (
                                                <Button size="small" variant="outlined" startIcon={<EditIcon fontSize="small" />} onClick={() => startEdit(idx)}
                                                    sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                                                    Cập nhật
                                                </Button>
                                            )}
                                        </Stack>
                                        {editingMilestone?.milestoneIndex === idx && (
                                            <Box mt={2} p={2} sx={{ bgcolor: alpha("#4f46e5", 0.04), borderRadius: 2 }}>
                                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                                                    <FormControl fullWidth size="small">
                                                        <InputLabel>Trạng thái</InputLabel>
                                                        <Select value={editingMilestone.status} label="Trạng thái"
                                                            onChange={e => setEditingMilestone(p => ({ ...p, status: e.target.value }))}>
                                                            {MILESTONE_STATUS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                                                        </Select>
                                                    </FormControl>
                                                    <TextField fullWidth size="small" label="Điểm (0 - 10)" type="number" inputProps={{ min: 0, max: 10, step: 0.5 }}
                                                        value={editingMilestone.score} onChange={e => setEditingMilestone(p => ({ ...p, score: e.target.value }))} />
                                                    <TextField fullWidth size="small" label="Nhận xét" value={editingMilestone.comment}
                                                        onChange={e => setEditingMilestone(p => ({ ...p, comment: e.target.value }))} />
                                                </Box>
                                                <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
                                                    <Button size="small" onClick={() => setEditingMilestone(null)} sx={{ textTransform: "none" }}>Hủy</Button>
                                                    <Button size="small" variant="contained" onClick={saveMilestone} disabled={saving}
                                                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <ApproveIcon fontSize="small" />}
                                                        sx={{ textTransform: "none", borderRadius: 2, background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                                                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        )}
                                    </Paper>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
