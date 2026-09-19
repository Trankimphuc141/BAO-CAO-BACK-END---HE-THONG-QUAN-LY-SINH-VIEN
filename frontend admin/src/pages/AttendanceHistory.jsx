import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const STATUS_OPTIONS = [
    { value: 'present', label: '✅ Có mặt', color: '#059669', bg: '#ecfdf5' },
    { value: 'late', label: '⏰ Đi muộn', color: '#D97706', bg: '#fffbeb' },
    { value: 'excused_absent', label: '📋 Nghỉ phép', color: '#2563EB', bg: '#eff6ff' },
    { value: 'unexcused_absent', label: '❌ Nghỉ K/P', color: '#DC2626', bg: '#fef2f2' },
];

const STATUS_MAP = {
    present: { label: 'Có mặt', color: '#059669', bg: '#ecfdf5' },
    late: { label: 'Đi muộn', color: '#D97706', bg: '#fffbeb' },
    excused_absent: { label: 'Nghỉ phép', color: '#2563EB', bg: '#eff6ff' },
    unexcused_absent: { label: 'Vắng K/P', color: '#DC2626', bg: '#fef2f2' },
};

export default function AttendanceHistory() {
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [history, setHistory] = useState([]);
    const [sectionDetail, setSectionDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingSections, setLoadingSections] = useState(true);
    const [expandedSession, setExpandedSession] = useState(null);
    const [editingSession, setEditingSession] = useState(null); // session đang edit
    const [editRecords, setEditRecords] = useState({}); // { studentId: { status, note } }
    const [saving, setSaving] = useState(false);
    const [unfinalizing, setUnfinalizing] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        const loadSections = async () => {
            setLoadingSections(true);
            const res = await api.getClassSectionsAll();
            if (res.success && res.data?.length) {
                setSections(res.data);
                setSelectedSection(res.data[0]._id);
            }
            setLoadingSections(false);
        };
        loadSections();
    }, []);

    const fetchHistory = useCallback(async () => {
        if (!selectedSection) return;
        setLoading(true);
        try {
            const res = await api.getAttendanceHistory(selectedSection);
            if (res.success) {
                setHistory(res.sessions || []);
                setSectionDetail(res.section || null);
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, [selectedSection]);

    useEffect(() => {
        fetchHistory();
        const handleFocus = () => fetchHistory();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchHistory]);

    const handleUnfinalize = async (sess) => {
        if (!window.confirm(`Bỏ chốt điểm danh buổi ${sess.sessionNumber}? Giảng viên có thể sửa lại sau đó.`)) return;
        setUnfinalizing(sess._id);
        const res = await api.unfinalizeAttendance(selectedSection, sess.sessionNumber);
        setUnfinalizing(null);
        if (res.success) {
            showToast(`✅ Đã bỏ chốt buổi ${sess.sessionNumber}`);
            fetchHistory();
        } else {
            showToast(res.message || 'Lỗi khi bỏ chốt', 'error');
        }
    };

    const startEdit = (sess) => {
        setEditingSession(sess._id);
        setExpandedSession(sess._id);
        const init = {};
        (sectionDetail?.students || []).forEach(st => {
            const rec = sess.records.find(r => (r.student?._id || r.student)?.toString() === st._id?.toString());
            init[st._id] = { status: rec?.status || 'present', note: rec?.note || '' };
        });
        setEditRecords(init);
    };

    const cancelEdit = () => {
        setEditingSession(null);
        setEditRecords({});
    };

    const handleSaveEdit = async (sess) => {
        setSaving(true);
        const records = Object.keys(editRecords).map(studentId => ({
            student: studentId,
            status: editRecords[studentId].status,
            note: editRecords[studentId].note
        }));
        const res = await api.adminEditAttendance(selectedSection, sess.sessionNumber, sess.date, records);
        setSaving(false);
        if (res.success) {
            showToast(`✅ ${res.message}`);
            setEditingSession(null);
            setEditRecords({});
            fetchHistory();
        } else {
            showToast(res.message || 'Lỗi khi lưu', 'error');
        }
    };

    const totalPlanSessions = sectionDetail?.totalLessons || 15;
    const recordedSessions = history.length;
    const finalizedCount = history.filter(s => s.isFinalized).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '14px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '14px',
                    background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
                    border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
                    color: toast.type === 'success' ? '#15803d' : '#b91c1c',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>{toast.msg}</div>
            )}

            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                borderRadius: '16px', padding: '28px 32px', color: 'white',
                boxShadow: '0 20px 40px rgba(124,58,237,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '28px' }}>📋</span>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Lịch Sử Điểm Danh — Admin (15 Buổi Học)</h2>
                </div>
                <p style={{ margin: 0, opacity: 0.85, fontSize: '14px' }}>
                    Theo dõi đầy đủ 15 buổi học · Quản lý chốt điểm danh · Chỉnh sửa điểm danh đã chốt
                </p>
            </div>

            {/* Section selector + stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '16px', alignItems: 'center' }}>
                <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Chọn lớp học phần
                    </label>
                    <select
                        value={selectedSection}
                        onChange={e => setSelectedSection(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: '10px',
                            border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600,
                            background: 'white', cursor: 'pointer', marginTop: '6px',
                            outline: 'none', fontFamily: 'inherit'
                        }}
                    >
                        {loadingSections ? (
                            <option>Đang tải...</option>
                        ) : sections.map(sec => (
                            <option key={sec._id} value={sec._id}>
                                {sec.sectionCode} — {sec.course?.name}
                            </option>
                        ))}
                    </select>
                </div>
                {[
                    { label: 'Tổng kế hoạch', value: `${totalPlanSessions} buổi`, color: '#6366f1', bg: '#eef2ff' },
                    { label: 'Đã điểm danh', value: `${recordedSessions}/${totalPlanSessions}`, color: '#4f46e5', bg: '#eff6ff' },
                    { label: 'Đã chốt', value: finalizedCount, color: '#d97706', bg: '#fef3c7' },
                    { label: 'Chưa chốt', value: recordedSessions - finalizedCount, color: '#059669', bg: '#ecfdf5' },
                ].map(s => (
                    <div key={s.label} style={{
                        textAlign: 'center', padding: '12px 18px', borderRadius: '12px',
                        background: s.bg, border: `1px solid ${s.color}20`
                    }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: s.color, fontWeight: 700 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Section info */}
            {sectionDetail && (
                <div style={{
                    padding: '14px 18px', borderRadius: '10px',
                    background: 'rgba(79,70,229,0.05)', border: '1px solid rgba(79,70,229,0.15)',
                    display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px'
                }}>
                    <span>📚 <strong>Môn:</strong> {sectionDetail.courseName}</span>
                    <span>👨‍🏫 <strong>GV:</strong> {sectionDetail.teacherName}</span>
                    <span>👥 <strong>SV:</strong> {sectionDetail.students?.length || 0} người</span>
                    <span>📅 <strong>Tổng số buổi:</strong> 15 buổi học (Vắng 1 buổi -6.67% chuyên cần cả có phép/không phép, cấm thi khi vắng &gt; 30%)</span>
                </div>
            )}

            {/* History list */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
                    <div>Đang tải lịch sử...</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Array.from({ length: totalPlanSessions }, (_, i) => i + 1).map((sessNum) => {
                        const sess = (history || []).find(s => s.sessionNumber === sessNum);
                        if (!sess) {
                            return (
                                <div key={sessNum} style={{
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    padding: '14px 20px', borderRadius: '14px',
                                    border: '1.5px dashed #cbd5e1', background: '#f8fafc',
                                    opacity: 0.8
                                }}>
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
                                        background: '#e2e8f0', color: '#64748b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: '16px'
                                    }}>
                                        {sessNum}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#64748b' }}>
                                            Buổi {sessNum} — Chưa diễn ra / Chưa điểm danh
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                            Chưa có dữ liệu điểm danh được ghi nhận cho buổi này
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
                                        background: '#f1f5f9', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0'
                                    }}>Chưa ghi nhận</span>
                                </div>
                            );
                        }

                        const isEditing = editingSession === sess._id;
                        const isExpanded = expandedSession === sess._id;
                        const presentCount = sess.records.filter(r => r.status === 'present').length;
                        const absentCount = sess.records.filter(r => r.status === 'unexcused_absent').length;

                        return (
                            <div key={sess._id} style={{
                                borderRadius: '14px', overflow: 'hidden',
                                border: `2px solid ${sess.isFinalized ? '#d97706' : '#e2e8f0'}`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}>
                                {/* Session Header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    padding: '14px 20px',
                                    background: sess.isFinalized ? 'rgba(217,119,6,0.05)' : 'rgba(248,250,252,1)',
                                    cursor: 'pointer'
                                }} onClick={() => setExpandedSession(isExpanded ? null : sess._id)}>
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
                                        background: sess.isFinalized ? '#d97706' : '#4f46e5',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 800, fontSize: '16px'
                                    }}>
                                        {sess.sessionNumber}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                                            Buổi {sess.sessionNumber} — {sess.date}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                            ✅ {presentCount} có mặt · ❌ {absentCount} vắng K/P ·
                                            GV: {sess.takenBy?.name || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        {sess.isFinalized ? (
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a'
                                            }}>🔒 Đã chốt</span>
                                        ) : (
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
                                            }}>✏️ Chưa chốt</span>
                                        )}

                                        {/* Admin actions */}
                                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => startEdit(sess)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                    background: '#4f46e5', color: 'white', fontSize: '12px',
                                                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                                                }}
                                            >✏️ Sửa</button>
                                            {sess.isFinalized && (
                                                <button
                                                    onClick={() => handleUnfinalize(sess)}
                                                    disabled={unfinalizing === sess._id}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                        background: '#d97706', color: 'white', fontSize: '12px',
                                                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                                        opacity: unfinalizing === sess._id ? 0.6 : 1
                                                    }}
                                                >
                                                    {unfinalizing === sess._id ? '...' : '🔓 Bỏ chốt'}
                                                </button>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                            {isExpanded ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>

                                {/* Session Detail */}
                                {isExpanded && (
                                    <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9' }}>
                                        {sess.isFinalized && (
                                            <div style={{
                                                padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
                                                background: '#fef3c7', border: '1px solid #fde68a',
                                                fontSize: '13px', color: '#92400e'
                                            }}>
                                                🔒 Chốt lúc <strong>{new Date(sess.finalizedAt).toLocaleString('vi-VN')}</strong>
                                                {sess.finalizedBy?.name && ` bởi ${sess.finalizedBy.name}`}
                                            </div>
                                        )}

                                        {isEditing ? (
                                            /* Edit Mode */
                                            <div>
                                                <div style={{
                                                    padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
                                                    background: '#eff6ff', border: '1px solid #bfdbfe',
                                                    fontSize: '13px', color: '#1d4ed8', fontWeight: 600
                                                }}>
                                                    ✏️ Chế độ Admin - Sửa điểm danh (kể cả khi đã chốt)
                                                </div>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                        <thead>
                                                            <tr style={{ background: '#f8fafc' }}>
                                                                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Sinh viên</th>
                                                                {STATUS_OPTIONS.map(opt => (
                                                                    <th key={opt.value} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', minWidth: '90px' }}>
                                                                        {opt.label}
                                                                    </th>
                                                                ))}
                                                                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Ghi chú</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(sectionDetail?.students || []).map((st, i) => (
                                                                <tr key={st._id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                                                    <td style={{ padding: '10px 14px' }}>
                                                                        <div style={{ fontWeight: 600 }}>{st.name}</div>
                                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{st.code}</div>
                                                                    </td>
                                                                    {STATUS_OPTIONS.map(opt => (
                                                                        <td key={opt.value} style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                            <div
                                                                                onClick={() => setEditRecords(prev => ({
                                                                                    ...prev,
                                                                                    [st._id]: { ...prev[st._id], status: opt.value }
                                                                                }))}
                                                                                style={{
                                                                                    width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto',
                                                                                    border: '2px solid',
                                                                                    borderColor: editRecords[st._id]?.status === opt.value ? opt.color : '#e2e8f0',
                                                                                    background: editRecords[st._id]?.status === opt.value ? opt.bg : 'transparent',
                                                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    transition: 'all 0.15s'
                                                                                }}
                                                                            >
                                                                                {editRecords[st._id]?.status === opt.value && (
                                                                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: opt.color }} />
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    ))}
                                                                    <td style={{ padding: '10px 14px' }}>
                                                                        <input
                                                                            value={editRecords[st._id]?.note || ''}
                                                                            onChange={e => setEditRecords(prev => ({
                                                                                ...prev,
                                                                                [st._id]: { ...prev[st._id], note: e.target.value }
                                                                            }))}
                                                                            placeholder="Ghi chú..."
                                                                            style={{
                                                                                width: '140px', padding: '5px 8px', borderRadius: '6px',
                                                                                border: '1px solid #e2e8f0', fontSize: '12px', fontFamily: 'inherit'
                                                                            }}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                                                    <button onClick={cancelEdit}
                                                        style={{
                                                            padding: '9px 20px', borderRadius: '9px', border: '1.5px solid #e2e8f0',
                                                            background: 'white', color: '#64748b', fontWeight: 700,
                                                            cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px'
                                                        }}>Huỷ</button>
                                                    <button onClick={() => handleSaveEdit(sess)} disabled={saving}
                                                        style={{
                                                            padding: '9px 20px', borderRadius: '9px', border: 'none',
                                                            background: saving ? '#94a3b8' : '#4f46e5', color: 'white', fontWeight: 700,
                                                            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px'
                                                        }}>
                                                        {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View Mode */
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f8fafc' }}>
                                                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Sinh viên</th>
                                                            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Trạng thái</th>
                                                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Ghi chú</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sess.records.map((rec, i) => {
                                                            const st = STATUS_MAP[rec.status] || { label: rec.status, color: '#6b7280', bg: '#f3f4f6' };
                                                            return (
                                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                                                    <td style={{ padding: '10px 14px' }}>
                                                                        <div style={{ fontWeight: 600 }}>{rec.student?.name || `SV #${i + 1}`}</div>
                                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{rec.student?.code || ''}</div>
                                                                    </td>
                                                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                        <span style={{
                                                                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                                            background: st.bg, color: st.color
                                                                        }}>{st.label}</span>
                                                                    </td>
                                                                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b' }}>
                                                                        {rec.note || '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {sess.records.length === 0 && (
                                                            <tr>
                                                                <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                                                    Chưa có dữ liệu điểm danh cho buổi này
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
