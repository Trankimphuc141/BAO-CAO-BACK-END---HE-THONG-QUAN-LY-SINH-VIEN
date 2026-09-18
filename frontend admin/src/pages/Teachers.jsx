import React, { useState, useEffect, useCallback } from 'react';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);

      const res = await fetch(`${BASE}/admin/users?role=teacher&${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : {};
      setTeachers(data.data || data.users || []);
      setTotal(data.total || 0);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(debouncedSearch); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(total / limit);

  const deptColors = {
    'Công nghệ thông tin': '#2563eb',
    'Toán': '#7c3aed',
    'Vật lý': '#059669',
    'Hóa học': '#d97706',
    'Kinh tế': '#e11d48',
  };

  return (
    <div className="animate-in">
      <div className="glass-panel">
        <div className="panel-header">
          <h3>
            <i className="fa-solid fa-chalkboard-user" />
            Danh Sách Giảng Viên
            {total > 0 && (
              <span className="badge badge-success" style={{ marginLeft: 6 }}>{total}</span>
            )}
          </h3>
          <button className="btn btn-primary">
            <i className="fa-solid fa-user-plus" /> Thêm Giảng Viên
          </button>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '320px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-light)', fontSize: '13px'
            }} />
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tên, mã GV, khoa..."
              value={debouncedSearch}
              onChange={e => setDebouncedSearch(e.target.value)}
              style={{ paddingLeft: '34px' }}
            />
          </div>
          <button className="btn btn-secondary btn-icon" onClick={fetchTeachers} title="Làm mới">
            <i className="fa-solid fa-rotate-right" style={{ fontSize: '13px' }} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Mã GV</th>
                <th>Họ Tên</th>
                <th>Email</th>
                <th>Khoa / Bộ Môn</th>
                <th>Số ĐT</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <i className="fa-solid fa-chalkboard-user" />
                      <p>
                        {debouncedSearch
                          ? 'Không tìm thấy giảng viên phù hợp.'
                          : 'Chưa có dữ liệu giảng viên. Hãy thêm giảng viên hoặc kết nối API.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                teachers.map((gv, i) => {
                  const color = deptColors[gv.department] || '#64748b';
                  return (
                    <tr key={gv._id || i}>
                      <td style={{ color: 'var(--text-light)', fontSize: '12px' }}>{(page - 1) * limit + i + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-purple)', fontSize: '12.5px' }}>
                          {gv.code || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${color}, ${color}99)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {gv.name?.charAt(0)?.toUpperCase() || 'G'}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{gv.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{gv.email || '—'}</td>
                      <td>
                        {gv.department ? (
                          <span style={{
                            display: 'inline-block', padding: '2px 9px', borderRadius: '20px',
                            background: `${color}15`, color, fontSize: '11.5px', fontWeight: 600,
                            border: `1px solid ${color}25`,
                          }}>
                            {gv.department}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{gv.phone || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-secondary btn-sm btn-icon" title="Xem chi tiết">
                            <i className="fa-solid fa-eye" style={{ fontSize: '12px', color: 'var(--primary)' }} />
                          </button>
                          <button className="btn btn-secondary btn-sm btn-icon" title="Chỉnh sửa">
                            <i className="fa-solid fa-pen-to-square" style={{ fontSize: '12px', color: 'var(--accent-amber)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, total)} trong {total} giảng viên
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <i className="fa-solid fa-chevron-left" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, page - 2) + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPage(p)}
                    style={{ minWidth: 32, justifyContent: 'center' }}
                  >
                    {p}
                  </button>
                );
              })}
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teachers;
