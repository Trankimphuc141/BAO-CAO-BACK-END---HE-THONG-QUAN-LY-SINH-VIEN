import React, { useEffect, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const getHeaders = () => {
  const token = localStorage.getItem("adminToken");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const ACTION_META = {
  LOGIN:                   { icon: "fa-right-to-bracket",  color: "#10b981", bg: "#ecfdf5",  label: "Đăng nhập" },
  LOGOUT:                  { icon: "fa-right-from-bracket",color: "#6b7280", bg: "#f9fafb",  label: "Đăng xuất" },
  CREATE:                  { icon: "fa-circle-plus",        color: "#3b82f6", bg: "#eff6ff",  label: "Thêm mới" },
  UPDATE:                  { icon: "fa-pen-to-square",      color: "#f59e0b", bg: "#fffbeb",  label: "Cập nhật" },
  DELETE:                  { icon: "fa-trash",              color: "#ef4444", bg: "#fef2f2",  label: "Xóa" },
  VIEW:                    { icon: "fa-eye",                color: "#8b5cf6", bg: "#f5f3ff",  label: "Xem" },
  CLICK:                   { icon: "fa-arrow-pointer",      color: "#0284c7", bg: "#f0f9ff",  label: "Sự kiện click" },
  SEND_NOTIFICATION:       { icon: "fa-bullhorn",           color: "#06b6d4", bg: "#ecfeff",  label: "Gửi thông báo" },
  DRAFT_NOTIFICATION:      { icon: "fa-file-pen",           color: "#64748b", bg: "#f8fafc",  label: "Soạn thông báo" },
  GRADE_LOCK:              { icon: "fa-lock",               color: "#dc2626", bg: "#fef2f2",  label: "Khóa điểm" },
  GRADE_UNLOCK:            { icon: "fa-lock-open",          color: "#16a34a", bg: "#f0fdf4",  label: "Mở khóa điểm" },
  GRADE_PUBLISH:           { icon: "fa-flag-checkered",     color: "#7c3aed", bg: "#f5f3ff",  label: "Công bố điểm" },
  GRADE_UPDATE:            { icon: "fa-star-half-stroke",   color: "#d97706", bg: "#fffbeb",  label: "Sửa điểm" },
  APPEAL_SUBMIT:           { icon: "fa-hand",               color: "#f97316", bg: "#fff7ed",  label: "Nộp phúc khảo" },
  APPEAL_DECIDE:           { icon: "fa-gavel",              color: "#4f46e5", bg: "#eef2ff",  label: "Xử lý phúc khảo" },
  ATTENDANCE_SUBMIT:       { icon: "fa-clipboard-check",    color: "#059669", bg: "#ecfdf5",  label: "Điểm danh" },
  ATTENDANCE_UNFINALIZE:   { icon: "fa-clock-rotate-left",  color: "#ea580c", bg: "#fff7ed",  label: "Mở khóa điểm danh" },
  ATTENDANCE_EDIT:         { icon: "fa-calendar-pen",       color: "#0284c7", bg: "#eff6ff",  label: "Sửa điểm danh" },
  THESIS_REGISTER:         { icon: "fa-graduation-cap",     color: "#7c3aed", bg: "#f5f3ff",  label: "Đăng ký đề tài" },
  THESIS_MILESTONE_UPDATE: { icon: "fa-flag",               color: "#0891b2", bg: "#ecfeff",  label: "Cập nhật mốc" },
  THESIS_FILE_UPLOAD:      { icon: "fa-file-arrow-up",      color: "#16a34a", bg: "#f0fdf4",  label: "Nộp file" },
  SCHEDULE_SET:            { icon: "fa-calendar-plus",      color: "#9333ea", bg: "#faf5ff",  label: "Chốt lịch" },
  SECTION_OPEN:            { icon: "fa-door-open",          color: "#2563eb", bg: "#eff6ff",  label: "Mở học phần" },
  SECTION_CLOSE:           { icon: "fa-door-closed",        color: "#dc2626", bg: "#fef2f2",  label: "Đóng học phần" },
  ENROLLMENT_REGISTER:     { icon: "fa-user-plus",          color: "#0284c7", bg: "#eff6ff",  label: "Đăng ký học phần" },
  ENROLLMENT_DROP:         { icon: "fa-user-minus",         color: "#dc2626", bg: "#fef2f2",  label: "Hủy đăng ký" },
  OTHER:                   { icon: "fa-circle-info",        color: "#64748b", bg: "#f8fafc",  label: "Khác" },
};

const ROLE_COLORS = {
  admin:   { bg: "#f0fdf4", color: "#16a34a", border: "#86efac", icon: "fa-user-tie" },
  teacher: { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd", icon: "fa-chalkboard-user" },
  student: { bg: "#fdf4ff", color: "#9333ea", border: "#d8b4fe", icon: "fa-user-graduate" },
  system:  { bg: "#f8fafc", color: "#64748b", border: "#cbd5e1", icon: "fa-gear" },
};

const MODULE_LABELS = {
  users:"Người dùng", students:"Sinh viên", teachers:"Giảng viên",
  grades:"Điểm", attendance:"Điểm danh", notifications:"Thông báo",
  thesis:"Đề tài", academic:"Học thuật", sections:"Học phần",
  enrollment:"Đăng ký", appeals:"Phúc khảo", auth:"Xác thực", system:"Hệ thống", other:"Khác"
};

const fmtTime = (iso) => new Date(iso).toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit" });
const fmtDate = (iso) => new Date(iso).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [view, setView] = useState("table");
  const [filters, setFilters] = useState({ role:"", action:"", module:"", status:"", search:"", from:"", to:"" });

  const loadLogs = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: pg, limit: 50, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) });
      const res = await fetch(`${API_BASE}/activity-logs?${q}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) { setLogs(data.data || []); setTotal(data.total || 0); setPage(data.page || 1); setPages(data.pages || 1); }
    } catch {}
    setLoading(false);
  }, [filters]);

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/activity-logs/stats`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {}
  };

  useEffect(() => { loadLogs(1); loadStats(); }, [filters]);

  const getAM = (action) => ACTION_META[action] || ACTION_META.OTHER;
  const getRS = (role) => ROLE_COLORS[role] || ROLE_COLORS.system;
  const setFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  const handleClearOld = async () => {
    if (!window.confirm("Xóa tất cả log cũ hơn 30 ngày?")) return;
    const res = await fetch(`${API_BASE}/activity-logs/clear`, { method:"POST", headers:getHeaders(), body:JSON.stringify({ daysOld:30 }) });
    const d = await res.json();
    if (d.success) { alert(`Đã xóa ${d.deleted} log cũ.`); loadLogs(1); loadStats(); }
  };

  const handleClearAll = async () => {
    if (!window.confirm("⚠️ Bạn có chắc chắn muốn XÓA TOÀN BỘ nhật ký hoạt động không? Hành động này sẽ làm sạch toàn bộ dữ liệu nhật ký!")) return;
    try {
      const res = await fetch(`${API_BASE}/activity-logs/clear-all`, { method:"POST", headers:getHeaders() });
      const d = await res.json();
      if (d.success) { 
        alert(`Đã dọn dẹp sạch toàn bộ nhật ký (${d.deleted} bản ghi)!`); 
        loadLogs(1); 
        loadStats(); 
      }
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h2 style={{ margin:0, fontSize:"20px", fontWeight:800, color:"#1e293b" }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color:"#4f46e5", marginRight:"8px" }}></i>
            Nhật Ký Hoạt Động Hệ Thống
          </h2>
          <p style={{ margin:"4px 0 0", fontSize:"13px", color:"#64748b" }}>Theo dõi các thao tác click, xóa, sửa, gửi thông báo, chốt lịch thực tế theo thời gian thực</p>
        </div>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          <button onClick={() => { loadLogs(1); loadStats(); }}
            style={{ padding:"8px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", cursor:"pointer", fontSize:"13px", fontWeight:600, color:"#334155" }}>
            <i className="fa-solid fa-rotate" style={{ marginRight:"5px", color:"#4f46e5" }}></i> Làm mới
          </button>
          <button onClick={handleClearOld}
            style={{ padding:"8px 14px", border:"1px solid #fed7aa", borderRadius:"8px", background:"#fff7ed", cursor:"pointer", fontSize:"13px", color:"#c2410c", fontWeight:600 }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ marginRight:"5px" }}></i> Xóa log &gt; 30 ngày
          </button>
          <button onClick={handleClearAll}
            style={{ padding:"8px 14px", border:"1px solid #fca5a5", borderRadius:"8px", background:"#fef2f2", cursor:"pointer", fontSize:"13px", color:"#dc2626", fontWeight:600 }}>
            <i className="fa-solid fa-trash-can" style={{ marginRight:"5px" }}></i> Xóa toàn bộ nhật ký
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", marginBottom:"18px" }}>
          {[
            { label:"Tổng hoạt động", value:stats.total??0, icon:"fa-list-ul", color:"#4f46e5", bg:"#eef2ff" },
            { label:"Hôm nay", value:stats.todayCount??0, icon:"fa-calendar-day", color:"#059669", bg:"#ecfdf5" },
            { label:"Từ sinh viên", value:stats.byRole?.find(r=>r._id==="student")?.count??0, icon:"fa-user-graduate", color:"#9333ea", bg:"#fdf4ff" },
            { label:"Từ giảng viên", value:stats.byRole?.find(r=>r._id==="teacher")?.count??0, icon:"fa-chalkboard-user", color:"#2563eb", bg:"#eff6ff" },
          ].map((s,i) => (
            <div key={i} style={{ background:"white", borderRadius:"12px", padding:"14px 18px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)", display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ width:"42px", height:"42px", borderRadius:"10px", background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <i className={`fa-solid ${s.icon}`} style={{ color:s.color, fontSize:"17px" }}></i>
              </div>
              <div>
                <div style={{ fontSize:"22px", fontWeight:800, color:"#1e293b" }}>{s.value.toLocaleString?.()??s.value}</div>
                <div style={{ fontSize:"11px", color:"#64748b" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top actions */}
      {stats?.byAction?.length > 0 && (
        <div style={{ background:"white", borderRadius:"12px", padding:"12px 16px", marginBottom:"14px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:"12px", fontWeight:700, color:"#374151", marginBottom:"8px" }}>
            <i className="fa-solid fa-chart-bar" style={{ color:"#4f46e5", marginRight:"5px" }}></i>Hành động phổ biến
          </div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            {stats.byAction.slice(0,8).map(a => {
              const am = getAM(a._id);
              return (
                <button key={a._id} onClick={() => setFilter("action", a._id)}
                  style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:am.bg, color:am.color, padding:"4px 10px", borderRadius:"20px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:600 }}>
                  <i className={`fa-solid ${am.icon}`} style={{ fontSize:"10px" }}></i>{am.label}
                  <span style={{ background:"rgba(0,0,0,0.1)", borderRadius:"10px", padding:"0 5px" }}>{a.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background:"white", borderRadius:"12px", padding:"12px 16px", marginBottom:"14px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:"1 1 180px" }}>
          <i className="fa-solid fa-search" style={{ position:"absolute", left:"9px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8", fontSize:"11px" }}></i>
          <input type="text" placeholder="Tìm kiếm..." value={filters.search} onChange={e => setFilter("search", e.target.value)}
            style={{ width:"100%", padding:"8px 8px 8px 28px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"12px", outline:"none", boxSizing:"border-box" }} />
        </div>
        {[
          { k:"role", opts:[["","Tất cả vai trò"],["admin","Admin"],["teacher","Giảng viên"],["student","Sinh viên"],["system","Hệ thống"]] },
          { k:"action", opts:[["","Tất cả hành động"],...Object.entries(ACTION_META).map(([k,v])=>[k,v.label])] },
          { k:"module", opts:[["","Tất cả module"],...Object.entries(MODULE_LABELS).map(([k,v])=>[k,v])] },
          { k:"status", opts:[["","Tất cả"],["success","✅ Thành công"],["failed","❌ Thất bại"],["warning","⚠️ Cảnh báo"]] },
        ].map(f => (
          <select key={f.k} value={filters[f.k]} onChange={e => setFilter(f.k, e.target.value)}
            style={{ padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"12px", outline:"none", minWidth:"130px" }}>
            {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <input type="date" value={filters.from} onChange={e => setFilter("from", e.target.value)} title="Từ ngày"
          style={{ padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"12px", outline:"none" }} />
        <input type="date" value={filters.to} onChange={e => setFilter("to", e.target.value)} title="Đến ngày"
          style={{ padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"12px", outline:"none" }} />
        <div style={{ display:"flex", border:"1px solid #e2e8f0", borderRadius:"8px", overflow:"hidden", marginLeft:"auto" }}>
          {[["table","fa-table"],["timeline","fa-timeline"]].map(([v,ic]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding:"7px 13px", border:"none", cursor:"pointer", background:view===v?"#4f46e5":"white", color:view===v?"white":"#64748b", fontSize:"13px" }}>
              <i className={`fa-solid ${ic}`}></i>
            </button>
          ))}
        </div>
        <button onClick={() => setFilters({ role:"", action:"", module:"", status:"", search:"", from:"", to:"" })}
          style={{ padding:"7px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", cursor:"pointer", fontSize:"12px", color:"#64748b" }}>
          <i className="fa-solid fa-rotate-left" style={{ marginRight:"4px" }}></i>Reset
        </button>
      </div>

      <div style={{ fontSize:"13px", color:"#64748b", marginBottom:"10px" }}>
        Tìm thấy <strong style={{ color:"#1e293b" }}>{total.toLocaleString()}</strong> hoạt động
        {(filters.role||filters.action||filters.module||filters.search) && <span style={{ marginLeft:"6px", color:"#4f46e5" }}>(đã lọc)</span>}
      </div>

      {/* Table view */}
      {view === "table" && (
        <div style={{ background:"white", borderRadius:"12px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
              <thead>
                <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                  {["Thời gian","Người thực hiện","Hành động","Mô tả chi tiết","Module","Kết quả"].map(h => (
                    <th key={h} style={{ padding:"11px 13px", textAlign:"left", fontWeight:700, color:"#374151", fontSize:"12px", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight:"8px" }}></i>Đang tải...
                  </td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign:"center", padding:"50px 20px", color:"#64748b" }}>
                    <div style={{ width:"48px", height:"48px", borderRadius:"12px", background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", color:"#4f46e5", fontSize:"20px" }}>
                      <i className="fa-solid fa-arrow-pointer"></i>
                    </div>
                    <div style={{ fontWeight:700, fontSize:"14px", color:"#1e293b", marginBottom:"4px" }}>Chưa có hoạt động nào được ghi nhận</div>
                    <div style={{ fontSize:"12px", color:"#94a3b8", maxWidth:"480px", margin:"0 auto" }}>Dữ liệu rác đã được làm sạch. Khi người dùng thực hiện các thao tác (click nút xóa, sửa, gửi thông báo, nộp bài, điểm danh, chốt lịch...), hệ thống sẽ tự động cập nhật nhật ký thực tế tại đây.</div>
                  </td></tr>
                ) : logs.map((log, i) => {
                  const am = getAM(log.action);
                  const rs = getRS(log.actor?.role);
                  return (
                    <tr key={log._id} style={{ borderBottom:"1px solid #f1f5f9", background:i%2===0?"white":"#fafafa" }}>
                      <td style={{ padding:"10px 13px", whiteSpace:"nowrap" }}>
                        <div style={{ fontWeight:600, color:"#374151", fontSize:"12px" }}>{fmtTime(log.createdAt)}</div>
                        <div style={{ fontSize:"11px", color:"#94a3b8" }}>{fmtDate(log.createdAt)}</div>
                      </td>
                      <td style={{ padding:"10px 13px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                          <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:rs.bg, border:`1.5px solid ${rs.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <i className={`fa-solid ${rs.icon}`} style={{ color:rs.color, fontSize:"11px" }}></i>
                          </div>
                          <div>
                            <div style={{ fontWeight:600, color:"#1e293b", fontSize:"12px" }}>{log.actor?.name||"Hệ thống"}</div>
                            <div style={{ fontSize:"10px", color:"#94a3b8" }}>{log.actor?.code||log.actor?.role}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"10px 13px" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:am.bg, color:am.color, padding:"3px 8px", borderRadius:"12px", fontSize:"11px", fontWeight:600, whiteSpace:"nowrap" }}>
                          <i className={`fa-solid ${am.icon}`}></i>{am.label}
                        </span>
                      </td>
                      <td style={{ padding:"10px 13px", maxWidth:"300px" }}>
                        <div style={{ fontSize:"12px", color:"#374151", lineHeight:1.4 }}>{log.description}</div>
                        {log.meta?.path && <div style={{ fontSize:"10px", color:"#94a3b8", fontFamily:"monospace", marginTop:"2px" }}>{log.meta.method} {log.meta.path}</div>}
                      </td>
                      <td style={{ padding:"10px 13px" }}>
                        <span style={{ fontSize:"11px", color:"#64748b", background:"#f1f5f9", padding:"2px 7px", borderRadius:"4px" }}>{MODULE_LABELS[log.module]||log.module}</span>
                      </td>
                      <td style={{ padding:"10px 13px" }}>
                        <span style={{ fontSize:"11px", fontWeight:600, padding:"2px 8px", borderRadius:"10px",
                          ...(log.status==="success"?{background:"#f0fdf4",color:"#16a34a"}:log.status==="failed"?{background:"#fef2f2",color:"#dc2626"}:{background:"#fffbeb",color:"#d97706"}) }}>
                          {log.status==="success"?"✅ Thành công":log.status==="failed"?"❌ Thất bại":"⚠️ Cảnh báo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderTop:"1px solid #e2e8f0", fontSize:"13px", color:"#64748b" }}>
              <span>Hiển thị {logs.length} / {total} hoạt động</span>
              <div style={{ display:"flex", gap:"6px" }}>
                <button onClick={() => loadLogs(page-1)} disabled={page<=1} style={{ padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:"6px", background:"white", cursor:page<=1?"not-allowed":"pointer", opacity:page<=1?0.4:1 }}>← Trước</button>
                <span style={{ padding:"5px 12px", background:"#4f46e5", color:"white", borderRadius:"6px", fontWeight:700 }}>{page}/{pages}</span>
                <button onClick={() => loadLogs(page+1)} disabled={page>=pages} style={{ padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:"6px", background:"white", cursor:page>=pages?"not-allowed":"pointer", opacity:page>=pages?0.4:1 }}>Tiếp →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline view */}
      {view === "timeline" && (
        <div>
          {loading && <div style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}><i className="fa-solid fa-spinner fa-spin"></i></div>}
          {(() => {
            const groups = {};
            logs.forEach(log => { const dk = fmtDate(log.createdAt); if (!groups[dk]) groups[dk] = []; groups[dk].push(log); });
            return Object.entries(groups).map(([date, dayLogs]) => (
              <div key={date} style={{ marginBottom:"22px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"12px" }}>
                  <div style={{ background:"#4f46e5", color:"white", padding:"4px 14px", borderRadius:"20px", fontSize:"12px", fontWeight:700 }}>📅 {date}</div>
                  <div style={{ flex:1, height:"1px", background:"#e2e8f0" }}></div>
                  <span style={{ fontSize:"11px", color:"#94a3b8" }}>{dayLogs.length} hoạt động</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column" }}>
                  {dayLogs.map((log, i) => {
                    const am = getAM(log.action);
                    const rs = getRS(log.actor?.role);
                    const isLast = i === dayLogs.length - 1;
                    return (
                      <div key={log._id} style={{ display:"flex", gap:"12px" }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, width:"34px" }}>
                          <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:am.bg, border:`2px solid ${am.color}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, zIndex:1 }}>
                            <i className={`fa-solid ${am.icon}`} style={{ color:am.color, fontSize:"12px" }}></i>
                          </div>
                          {!isLast && <div style={{ width:"2px", flex:1, background:"#e2e8f0", minHeight:"10px" }}></div>}
                        </div>
                        <div style={{ flex:1, paddingBottom:isLast?"0":"10px" }}>
                          <div style={{ background:"white", borderRadius:"10px", padding:"10px 13px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", border:"1px solid #f1f5f9" }}>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"5px", flexWrap:"wrap", gap:"4px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                                <span style={{ background:am.bg, color:am.color, padding:"2px 8px", borderRadius:"10px", fontSize:"11px", fontWeight:700 }}>{am.label}</span>
                                <span style={{ background:rs.bg, color:rs.color, padding:"2px 8px", borderRadius:"10px", fontSize:"10px", fontWeight:600, border:`1px solid ${rs.border}` }}>
                                  <i className={`fa-solid ${rs.icon}`} style={{ marginRight:"3px", fontSize:"9px" }}></i>
                                  {log.actor?.name||"Hệ thống"}{log.actor?.code?` (${log.actor.code})`:""}
                                </span>
                                <span style={{ fontSize:"11px", color:"#64748b", background:"#f1f5f9", padding:"2px 6px", borderRadius:"4px" }}>{MODULE_LABELS[log.module]||log.module}</span>
                              </div>
                              <span style={{ fontSize:"11px", color:"#94a3b8" }}>{fmtTime(log.createdAt)}</span>
                            </div>
                            <div style={{ fontSize:"12px", color:"#374151", lineHeight:1.5 }}>{log.description}</div>
                            {log.meta?.path && <div style={{ fontSize:"10px", color:"#94a3b8", fontFamily:"monospace", marginTop:"3px" }}>{log.meta.method} {log.meta.path}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
          {!loading && logs.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px", color:"#94a3b8" }}>
              <i className="fa-solid fa-inbox" style={{ fontSize:"32px", display:"block", marginBottom:"10px" }}></i>Không có hoạt động nào
            </div>
          )}
          {pages > 1 && (
            <div style={{ display:"flex", justifyContent:"center", gap:"8px", marginTop:"14px" }}>
              <button onClick={() => loadLogs(page-1)} disabled={page<=1} style={{ padding:"8px 20px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", cursor:page<=1?"not-allowed":"pointer", opacity:page<=1?0.4:1 }}>← Trước</button>
              <span style={{ padding:"8px 16px", background:"#4f46e5", color:"white", borderRadius:"8px", fontWeight:700 }}>{page}/{pages}</span>
              <button onClick={() => loadLogs(page+1)} disabled={page>=pages} style={{ padding:"8px 20px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", cursor:page>=pages?"not-allowed":"pointer", opacity:page>=pages?0.4:1 }}>Tiếp →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
