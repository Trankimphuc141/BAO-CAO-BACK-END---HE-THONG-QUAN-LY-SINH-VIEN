import { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import {
    Box, Typography, Paper, Grid, Chip, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    Stack, Alert, CircularProgress, Divider, Avatar, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    Select, FormControl, InputLabel, Tooltip, alpha, Card,
} from "@mui/material";
import {
    School as ThesisIcon,
    CheckCircle as ApproveIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
} from "@mui/icons-material";

const MILESTONE_STATUS = [
    { value: "Chua nop", label: "Chua nop", color: "#6b7280" },
    { value: "Da nop", label: "Da nop", color: "#3b82f6" },
    { value: "Dang duyet", label: "Dang duyet", color: "#f59e0b" },
    { value: "Da duyet", label: "Da duyet", color: "#10b981" },
    { value: "Yeu cau chinh sua", label: "Yeu cau chinh sua", color: "#ef4444" },
];

const msColor = (status) => {
    const map = {
        "Chua nop": "#6b7280", "Da nop": "#3b82f6", "Dang duyet": "#f59e0b",
        "Da duyet": "#10b981", "Yeu cau chinh sua": "#ef4444",
    };
    return map[status] || "#6b7280";
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
            setAlert({ type: "error", msg: "Khong the tai danh sach: " + (err.message || "") });
        } finally { setLoading(false); }
    };

    const openDetail = (thesis) => { setSelected(thesis); setEditingMilestone(null); setDialogOpen(true); };

    const startEdit = (mIdx) => {
        const m = selected.milestones[mIdx];
        setEditingMilestone({ milestoneIndex: mIdx, status: m.status || "Da nop", score: m.score ?? "", comment: m.comment || "" });
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
                setAlert({ type: "success", msg: "Cap nhat thanh cong!" });
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
    const inProgress = theses.filter(t => t.status === "Dang thuc hien").length;
    const done = theses.filter(t => t.status === "Hoan thanh").length;
    const pending = theses.filter(t => t.milestones?.some(m => m.status === "Da nop")).length;

    return (
        <Box>
            <Box sx={{ mb: 4, p: 3, borderRadius: 3, background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)", color: "white", boxShadow: "0 8px 28px rgba(99,102,241,0.35)" }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                    <ThesisIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800}>Quan Ly Do An / Luan Van</Typography>
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.85 }}>Theo doi tien do va phe duyet moc nop bai cua sinh vien</Typography>
            </Box>

            {alert && (<Alert severity={alert.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>)}

            <Grid container spacing={2} mb={4}>
                {[
                    { label: "Tong do an", value: total, color: "#4f46e5", icon: "📚" },
                    { label: "Dang thuc hien", value: inProgress, color: "#3b82f6", icon: "⚙️" },
                    { label: "Hoan thanh", value: done, color: "#10b981", icon: "✅" },
                    { label: "Cho kiem duyet", value: pending, color: "#f59e0b", icon: "⏳" },
                ].map(stat => (
                    <Grid item xs={6} sm={3} key={stat.label}>
                        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, textAlign: "center", p: 2 }}>
                            <Typography fontSize="1.8rem">{stat.icon}</Typography>
                            <Typography fontWeight={800} fontSize="1.8rem" sx={{ color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>{stat.label}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                    <Typography variant="subtitle1" fontWeight={700}>Danh sach do an tot nghiep</Typography>
                </Box>
                {loading ? (
                    <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress size={40} /><Typography mt={2} color="text.secondary">Dang tai...</Typography></Box>
                ) : theses.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: "center" }}><ThesisIcon sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} /><Typography color="text.secondary">Chua co do an nao.</Typography></Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha("#4f46e5", 0.04) }}>
                                    {["Sinh vien", "Ma de tai", "Ten de tai", "Trang thai", "M1", "M2", "M3", "M4", "Thao tac"].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", color: "text.secondary", whiteSpace: "nowrap" }}>{h}</TableCell>
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
                                        <TableCell>
                                            <Chip label={t.status} size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
                                        </TableCell>
                                        {[0, 1, 2, 3].map(i => {
                                            const m = t.milestones?.[i];
                                            return (
                                                <TableCell key={i} align="center">
                                                    {m ? (
                                                        <Tooltip title={`${m.name} - ${m.status}`}>
                                                            <Chip label={m.status === "Da duyet" ? "✓" : m.status === "Da nop" ? "!" : "–"} size="small"
                                                                sx={{ width: 28, height: 22, fontSize: "0.7rem", fontWeight: 700, bgcolor: alpha(msColor(m.status), 0.12), color: msColor(m.status), border: `1px solid ${alpha(msColor(m.status), 0.3)}` }} />
                                                        </Tooltip>
                                                    ) : "—"}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell>
                                            <Button size="small" variant="contained" startIcon={<ViewIcon fontSize="small" />} onClick={() => openDetail(t)}
                                                sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.75rem", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "none" }}>
                                                Duyet
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ pb: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <ThesisIcon color="primary" />
                        <Box>
                            <Typography fontWeight={800} fontSize="1rem">{selected?.topicTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{selected?.topicCode} - SV: {selected?.student?.name}</Typography>
                        </Box>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selected && (
                        <Box>
                            <Grid container spacing={2} mb={3}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Sinh vien</Typography>
                                    <Typography fontWeight={700}>{selected.student?.name} ({selected.student?.code})</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Giang vien huong dan</Typography>
                                    <Typography fontWeight={700}>{selected.advisor?.name || "Chua phan cong"}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Mo ta</Typography>
                                    <Typography fontSize="0.85rem" color="text.secondary">{selected.description || "—"}</Typography>
                                </Grid>
                            </Grid>
                            <Divider sx={{ mb: 3 }} />
                            <Typography fontWeight={700} mb={2}>Cac moc tien do (M1 den M4)</Typography>
                            <Stack spacing={2}>
                                {(selected.milestones || []).map((m, idx) => (
                                    <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: alpha(msColor(m.status), 0.4) }}>
                                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
                                            <Box flex={1}>
                                                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                                    <Typography fontWeight={700} fontSize="0.85rem">M{idx + 1}: {m.name}</Typography>
                                                    <Chip label={m.status} size="small" sx={{ fontWeight: 700, fontSize: "0.65rem", bgcolor: alpha(msColor(m.status), 0.12), color: msColor(m.status) }} />
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary">Han: {m.deadline}{m.score != null ? ` - Diem: ${m.score}` : ""}</Typography>
                                                {m.comment && <Typography fontSize="0.8rem" color="text.secondary" mt={0.5}>💬 {m.comment}</Typography>}
                                            </Box>
                                            {editingMilestone?.milestoneIndex === idx ? (
                                                <Chip label="Dang sua..." size="small" color="warning" />
                                            ) : (
                                                <Button size="small" variant="outlined" startIcon={<EditIcon fontSize="small" />} onClick={() => startEdit(idx)}
                                                    sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                                                    Cap nhat
                                                </Button>
                                            )}
                                        </Stack>
                                        {editingMilestone?.milestoneIndex === idx && (
                                            <Box mt={2} p={2} sx={{ bgcolor: alpha("#4f46e5", 0.04), borderRadius: 2 }}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={4}>
                                                        <FormControl fullWidth size="small">
                                                            <InputLabel>Trang thai</InputLabel>
                                                            <Select value={editingMilestone.status} label="Trang thai"
                                                                onChange={e => setEditingMilestone(p => ({ ...p, status: e.target.value }))}>
                                                                {MILESTONE_STATUS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField fullWidth size="small" label="Diem (0-10)" type="number" inputProps={{ min: 0, max: 10, step: 0.5 }}
                                                            value={editingMilestone.score} onChange={e => setEditingMilestone(p => ({ ...p, score: e.target.value }))} />
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <TextField fullWidth size="small" label="Nhan xet" value={editingMilestone.comment}
                                                            onChange={e => setEditingMilestone(p => ({ ...p, comment: e.target.value }))} />
                                                    </Grid>
                                                </Grid>
                                                <Stack direction="row" spacing={1} mt={1.5} justifyContent="flex-end">
                                                    <Button size="small" onClick={() => setEditingMilestone(null)} sx={{ textTransform: "none" }}>Huy</Button>
                                                    <Button size="small" variant="contained" onClick={saveMilestone} disabled={saving}
                                                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <ApproveIcon fontSize="small" />}
                                                        sx={{ textTransform: "none", borderRadius: 2, background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                                                        {saving ? "Dang luu..." : "Luu"}
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
                    <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Dong</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
