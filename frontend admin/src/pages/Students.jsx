import React, { useState, useEffect, useCallback } from 'react';

const STATUSES = {
  'active': { label: 'Đang học', cls: 'badge-success' },
  'graduated': { label: 'Tốt nghiệp', cls: 'badge-info' },
  'suspended': { label: 'Đình chỉ', cls: 'badge-danger' },
  'on_leave': { label: 'Bảo lưu', cls: 'badge-warning' },
};

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${BASE}/admin/users?role=student&${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : {};
      setStudents(data.data || data.users || []);
      setTotal(data.total || 0);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(debouncedSearch); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-in">
      <div className="glass-panel">
        <div className="panel-header">
          <h3>
            <i className="fa-solid fa-user-graduate" />
            Danh Sách Sinh Viên
            {total > 0 && (
              <span className="badge badge-info" style={{ marginLeft: 6 }}>{total}</span>
            )}
          </h3>
          <button className="btn btn-primary">
            <i className="fa-solid fa-user-plus" /> Thêm Sinh Viên
          </button>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '320px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-light)', fontSize: '13px'
            }} />
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tên, mã SV, email..."
              value={debouncedSearch}
              onChange={e => setDebouncedSearch(e.target.value)}
              style={{ paddingLeft: '34px' }}
            />
          </div>
          <select
            className="form-control"
            style={{ maxWidth: '180px' }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang học</option>
            <option value="graduated">Tốt nghiệp</option>
            <option value="on_leave">Bảo lưu</option>
            <option value="suspended">Đình chỉ</option>
          </select>
          <button className="btn btn-secondary btn-icon" onClick={fetchStudents} title="Làm mới">
            <i className="fa-solid fa-rotate-right" style={{ fontSize: '13px' }} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Mã SV</th>
                <th>Họ Tên</th>
                <th>Email</th>
                <th>Lớp</th>
                <th>Ngành</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <i className="fa-solid fa-users-slash" />
                      <p>
                        {debouncedSearch || statusFilter
                          ? 'Không tìm thấy sinh viên phù hợp với bộ lọc.'
                          : 'Chưa có dữ liệu sinh viên. Hãy thêm sinh viên hoặc kết nối API.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((sv, i) => {
                  const st = STATUSES[sv.status] || { label: sv.status || '—', cls: 'badge-info' };
                  return (
                    <tr key={sv._id || i}>
                      <td style={{ color: 'var(--text-light)', fontSize: '12px' }}>{(page - 1) * limit + i + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', fontSize: '12.5px' }}>
                          {sv.code || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: `hsl(${(sv.name?.charCodeAt(0) || 65) * 7 % 360}, 60%, 65%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {sv.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sv.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{sv.email || '—'}</td>
                      <td>{sv.class || sv.className || '—'}</td>
                      <td style={{ fontSize: '12.5px' }}>{sv.major || sv.department || '—'}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
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
              Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, total)} trong tổng số {total} sinh viên
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, page - 2);
                const p = start + i;
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
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Students;
