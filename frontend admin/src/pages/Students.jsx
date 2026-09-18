import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';

const STATUSES = {
  'active': { label: 'Đang học', cls: 'badge-success' },
  'Đang học': { label: 'Đang học', cls: 'badge-success' },
  'graduated': { label: 'Tốt nghiệp', cls: 'badge-info' },
  'Tốt nghiệp': { label: 'Tốt nghiệp', cls: 'badge-info' },
  'suspended': { label: 'Đình chỉ', cls: 'badge-danger' },
  'Đình chỉ': { label: 'Đình chỉ', cls: 'badge-danger' },
  'on_leave': { label: 'Bảo lưu', cls: 'badge-warning' },
  'Bảo lưu': { label: 'Bảo lưu', cls: 'badge-warning' },
};

const initialForm = {
  code: '',
  name: '',
  email: '',
  password: '123456',
  phone: '',
  classCode: 'K17-CNTT01',
  major: 'Kỹ thuật phần mềm',
  department: 'Công nghệ thông tin',
  academicYear: '2023-2027',
  gender: 'Nam',
  status: 'Đang học',
  dateOfBirth: ''
};

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // View profile modal states
  const [viewingStudent, setViewingStudent] = useState(null);
  const [viewModalShowPass, setViewModalShowPass] = useState(false);

  // Show/Hide password toggle state per row
  const [showPasswords, setShowPasswords] = useState({});
  const togglePassword = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.getUsers('student', params);
      setStudents(res.data || res.users || []);
      setTotal(res.total || 0);
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

  // Handle Create Student
  const handleOpenAdd = () => {
    setFormData(initialForm);
    setFormError('');
    setShowAddModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.code.trim() || !formData.name.trim() || !formData.email.trim()) {
      setFormError('Vui lòng điền đầy đủ Mã sinh viên, Họ tên và Email');
      return;
    }

    if (formData.phone && !/^0[0-9]{9}$/.test(formData.phone)) {
      setFormError('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0');
      return;
    }

    setSubmitting(true);
    const res = await api.createUser({ ...formData, role: 'student' });
    setSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      showToast(`✅ Thêm sinh viên "${formData.name}" (${formData.code.toUpperCase()}) thành công!`);
      setFormData(initialForm);
      fetchStudents();
    } else {
      setFormError(res.message || 'Không thể thêm sinh viên. Vui lòng kiểm tra lại dữ liệu.');
    }
  };

  // Handle Delete Student
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await api.deleteUser(deleteTarget._id);
    setDeleting(false);

    if (res.success) {
      showToast(`🗑️ Đã xóa sinh viên "${deleteTarget.name}" (${deleteTarget.code}) thành công!`);
      setDeleteTarget(null);
      fetchStudents();
    } else {
      showToast(res.message || 'Lỗi khi xóa sinh viên', 'error');
    }
  };

  return (
    <div className="animate-in" style={{ position: 'relative' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toast.type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px',
          fontWeight: 600,
          animation: 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '15px', marginLeft: 8 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="glass-panel">
        <div className="panel-header">
          <h3>
            <i className="fa-solid fa-user-graduate" />
            Danh Sách Sinh Viên
            {total > 0 && (
              <span className="badge badge-info" style={{ marginLeft: 6 }}>{total}</span>
            )}
          </h3>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
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
                <th>Mật Khẩu</th>
                <th>Email</th>
                <th>Lớp</th>
                <th>Ngành</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="empty-state">
                      <i className="fa-solid fa-users-slash" />
                      <p>
                        {debouncedSearch || statusFilter
                          ? 'Không tìm thấy sinh viên phù hợp với bộ lọc.'
                          : 'Chưa có dữ liệu sinh viên trong hệ thống.'}
                      </p>
                      <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleOpenAdd}>
                        <i className="fa-solid fa-user-plus" /> Thêm Sinh Viên Mới
                      </button>
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
                          <span
                            onClick={() => { setViewingStudent(sv); setViewModalShowPass(false); }}
                            style={{ fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.target.style.color = 'var(--primary)'}
                            onMouseLeave={e => e.target.style.color = 'var(--text-main)'}
                            title="Bấm để xem hồ sơ"
                          >
                            {sv.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--bg-hover)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)'
                        }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: showPasswords[sv._id] ? 'var(--primary)' : 'var(--text-muted)',
                            letterSpacing: showPasswords[sv._id] ? '0.5px' : '2px',
                            minWidth: '50px'
                          }}>
                            {showPasswords[sv._id] ? (sv.plainPassword || '123456') : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePassword(sv._id)}
                            title={showPasswords[sv._id] ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              color: showPasswords[sv._id] ? 'var(--primary)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <i className={`fa-solid ${showPasswords[sv._id] ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '11px' }} />
                          </button>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{sv.email || '—'}</td>
                      <td>{sv.class || sv.className || sv.classCode || '—'}</td>
                      <td style={{ fontSize: '12.5px' }}>{sv.major || sv.department || '—'}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Xem hồ sơ chi tiết"
                            onClick={() => { setViewingStudent(sv); setViewModalShowPass(false); }}
                            style={{ color: 'var(--primary)' }}
                          >
                            <i className="fa-solid fa-id-card" style={{ fontSize: '12px' }} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Xóa sinh viên"
                            onClick={() => setDeleteTarget(sv)}
                            style={{ color: '#ef4444' }}
                          >
                            <i className="fa-solid fa-trash-can" style={{ fontSize: '12px' }} />
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

      {/* Modal Thêm Sinh Viên */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => !submitting && setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-user-plus" style={{ color: 'var(--primary)' }} />
                Thêm Sinh Viên Mới
              </h3>
              <button
                className="modal-close"
                onClick={() => !submitting && setShowAddModal(false)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAdd}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {formError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#dc2626',
                    fontSize: '13px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fa-solid fa-circle-exclamation" />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Mã sinh viên <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      required
                      placeholder="VD: SV002"
                      value={formData.code}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%', textTransform: 'uppercase' }}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Họ và tên <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="VD: Nguyễn Văn A"
                      value={formData.name}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Email <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="VD: nguyenvana@student.edu.vn"
                      value={formData.email}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="VD: 0912345678"
                      value={formData.phone}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Lớp sinh hoạt <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="classCode"
                      required
                      placeholder="VD: K17-CNTT01"
                      value={formData.classCode}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Ngành học
                    </label>
                    <input
                      type="text"
                      name="major"
                      placeholder="VD: Kỹ thuật phần mềm"
                      value={formData.major}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Khoa
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Khóa học
                    </label>
                    <input
                      type="text"
                      name="academicYear"
                      value={formData.academicYear}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Giới tính
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Trạng thái học tập
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Đang học">Đang học</option>
                      <option value="Bảo lưu">Bảo lưu</option>
                      <option value="Đình chỉ">Đình chỉ</option>
                      <option value="Tốt nghiệp">Tốt nghiệp</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Mật khẩu khởi tạo
                    </label>
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Mật khẩu mặc định là 123456. Sinh viên có thể đổi sau khi đăng nhập.
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" /> Đang thêm...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check" /> Xác Nhận Thêm
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Xác Nhận Xóa */}
      {deleteTarget && createPortal(
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#ef4444' }}>
                <i className="fa-solid fa-triangle-exclamation" />
                Xác Nhận Xóa Sinh Viên
              </h3>
              <button
                className="modal-close"
                onClick={() => !deleting && setDeleteTarget(null)}
                disabled={deleting}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-main)', margin: 0 }}>
                Bạn có chắc chắn muốn xóa sinh viên <strong>{deleteTarget.name}</strong> (Mã SV: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{deleteTarget.code}</span>) khỏi hệ thống?
              </p>
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#b91c1c',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fa-solid fa-info-circle" />
                <span>Hành động này sẽ xóa dữ liệu sinh viên vĩnh viễn và không thể khôi phục.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" /> Đang xóa...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can" /> Xóa Vĩnh Viễn
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Xem Hồ Sơ Chi Tiết Sinh Viên */}
      {viewingStudent && createPortal(
        <div className="modal-overlay" onClick={() => setViewingStudent(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-id-card" style={{ color: 'var(--primary)' }} />
                Hồ Sơ Chi Tiết Sinh Viên
              </h3>
              <button className="modal-close" onClick={() => setViewingStudent(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Header Profile Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: 'var(--bg-hover)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                marginBottom: '18px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '22px',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                }}>
                  {viewingStudent.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {viewingStudent.name}
                    </h4>
                    <span className={`badge ${STATUSES[viewingStudent.status]?.cls || 'badge-info'}`}>
                      {STATUSES[viewingStudent.status]?.label || viewingStudent.status || 'Đang học'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }}>
                      {viewingStudent.code}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      Lớp: <strong style={{ color: 'var(--text-main)' }}>{viewingStudent.class || viewingStudent.classCode || '—'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Mã Sinh Viên
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                    {viewingStudent.code}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Mật Khẩu Đăng Nhập
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace', color: viewModalShowPass ? 'var(--primary)' : 'var(--text-main)', letterSpacing: viewModalShowPass ? '0.5px' : '2px' }}>
                      {viewModalShowPass ? (viewingStudent.plainPassword || '123456') : '••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewModalShowPass(!viewModalShowPass)}
                      title={viewModalShowPass ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: viewModalShowPass ? 'var(--primary)' : 'var(--text-muted)', padding: '2px' }}
                    >
                      <i className={`fa-solid ${viewModalShowPass ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '12px' }} />
                    </button>
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Email
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                    {viewingStudent.email}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Số Điện Thoại
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.phone || '— Chưa cập nhật'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Khoa / Viện
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.department || 'Công nghệ thông tin'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Chuyên Ngành
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.major || 'Kỹ thuật phần mềm'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Lớp Sinh Hoạt
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.class || viewingStudent.classCode || '—'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Khóa Học
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.academicYear || '2023-2027'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Giới Tính
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.gender || 'Nam'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Ngày Sinh
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.dateOfBirth || '— Chưa cập nhật'}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Ngày Tạo Tài Khoản
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.createdAt ? new Date(viewingStudent.createdAt).toLocaleString('vi-VN') : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setViewingStudent(null)}
              >
                Đóng Hồ Sơ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Students;
