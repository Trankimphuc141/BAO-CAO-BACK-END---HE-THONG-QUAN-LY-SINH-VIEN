import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';

const initialTeacherForm = {
  code: '',
  name: '',
  email: '',
  password: '123456',
  phone: '',
  department: 'Công nghệ thông tin',
  gender: 'Nam',
  status: 'Đang làm',
  dateOfBirth: ''
};

const TEACHER_STATUSES = {
  'working': { label: 'Đang làm', cls: 'badge-success' },
  'Đang làm': { label: 'Đang làm', cls: 'badge-success' },
  'Đang công tác': { label: 'Đang làm', cls: 'badge-success' },
  'resigned': { label: 'Nghỉ việc', cls: 'badge-danger' },
  'Nghỉ việc': { label: 'Nghỉ việc', cls: 'badge-danger' },
  'Tạm nghỉ': { label: 'Nghỉ việc', cls: 'badge-danger' }
};

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Add Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(initialTeacherForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Modal states
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editFormData, setEditFormData] = useState({ ...initialTeacherForm, password: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // Delete modal states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // View profile modal states
  const [viewingTeacher, setViewingTeacher] = useState(null);
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

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;

      const res = await api.getUsers('teacher', params);
      setTeachers(res.data || res.users || []);
      setTotal(res.total || 0);
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
    'Ngoại ngữ': '#0284c7'
  };

  // Handle Create Teacher
  const handleOpenAdd = () => {
    setFormData(initialTeacherForm);
    setFormError('');
    setShowAddModal(false);
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
      setFormError('Vui lòng điền đầy đủ Mã giảng viên, Họ tên và Email');
      return;
    }

    if (formData.phone && !/^0[0-9]{9}$/.test(formData.phone)) {
      setFormError('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0');
      return;
    }

    setSubmitting(true);
    const res = await api.createUser({ ...formData, role: 'teacher' });
    setSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      showToast(`✅ Thêm giảng viên "${formData.name}" (${formData.code.toUpperCase()}) thành công!`);
      setFormData(initialTeacherForm);
      fetchTeachers();
    } else {
      setFormError(res.message || 'Không thể thêm giảng viên. Vui lòng kiểm tra lại dữ liệu.');
    }
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (teacher) => {
    setEditingTeacher(teacher);
    setEditFormData({
      code: teacher.code || '',
      name: teacher.name || '',
      email: teacher.email || '',
      password: '', // Keep empty unless admin wants to change password
      phone: teacher.phone || '',
      department: teacher.department || 'Công nghệ thông tin',
      gender: teacher.gender || 'Nam',
      status: teacher.status || 'Đang làm',
      dateOfBirth: teacher.dateOfBirth || ''
    });
    setEditFormError('');
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setEditFormError('');

    if (!editFormData.code.trim() || !editFormData.name.trim() || !editFormData.email.trim()) {
      setEditFormError('Vui lòng điền đầy đủ Mã giảng viên, Họ tên và Email');
      return;
    }

    if (editFormData.phone && !/^0[0-9]{9}$/.test(editFormData.phone)) {
      setEditFormError('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0');
      return;
    }

    setEditSubmitting(true);
    const res = await api.updateUser(editingTeacher._id, editFormData);
    setEditSubmitting(false);

    if (res.success) {
      setEditingTeacher(null);
      showToast(`✏️ Đã cập nhật hồ sơ giảng viên "${editFormData.name}" thành công!`);
      fetchTeachers();
    } else {
      setEditFormError(res.message || 'Lỗi khi cập nhật thông tin giảng viên');
    }
  };

  // Handle Delete Teacher
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await api.deleteUser(deleteTarget._id);
    setDeleting(false);

    if (res.success) {
      showToast(`🗑️ Đã xóa giảng viên "${deleteTarget.name}" (${deleteTarget.code}) thành công!`);
      setDeleteTarget(null);
      fetchTeachers();
    } else {
      showToast(res.message || 'Lỗi khi xóa giảng viên', 'error');
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
            <i className="fa-solid fa-chalkboard-user" />
            Danh Sách Giảng Viên
            {total > 0 && (
              <span className="badge badge-success" style={{ marginLeft: 6 }}>{total}</span>
            )}
          </h3>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
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
                <th>Mật Khẩu</th>
                <th>Email</th>
                <th>Khoa / Bộ Môn</th>
                <th>Trạng Thái</th>
                <th>Số ĐT</th>
                <th style={{ textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="empty-state">
                      <i className="fa-solid fa-chalkboard-user" />
                      <p>
                        {debouncedSearch
                          ? 'Không tìm thấy giảng viên phù hợp.'
                          : 'Chưa có dữ liệu giảng viên trong hệ thống.'}
                      </p>
                      <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleOpenAdd}>
                        <i className="fa-solid fa-user-plus" /> Thêm Giảng Viên Mới
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                teachers.map((gv, i) => {
                  const color = deptColors[gv.department] || '#64748b';
                  const st = TEACHER_STATUSES[gv.status] || { label: gv.status || 'Đang làm', cls: 'badge-success' };

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
                          <span
                            onClick={() => { setViewingTeacher(gv); setViewModalShowPass(false); }}
                            style={{ fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.target.style.color = 'var(--primary)'}
                            onMouseLeave={e => e.target.style.color = 'var(--text-main)'}
                            title="Bấm để xem hồ sơ"
                          >
                            {gv.name || '—'}
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
                            color: showPasswords[gv._id] ? 'var(--primary)' : 'var(--text-muted)',
                            letterSpacing: showPasswords[gv._id] ? '0.5px' : '2px',
                            minWidth: '50px'
                          }}>
                            {showPasswords[gv._id] ? (gv.plainPassword || '123456') : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePassword(gv._id)}
                            title={showPasswords[gv._id] ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              color: showPasswords[gv._id] ? 'var(--primary)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <i className={`fa-solid ${showPasswords[gv._id] ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '11px' }} />
                          </button>
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
                      <td>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{gv.phone || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Xem hồ sơ chi tiết"
                            onClick={() => { setViewingTeacher(gv); setViewModalShowPass(false); }}
                            style={{ color: 'var(--primary)' }}
                          >
                            <i className="fa-solid fa-id-card" style={{ fontSize: '12px' }} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Chỉnh sửa hồ sơ"
                            onClick={() => handleOpenEdit(gv)}
                            style={{ color: '#2563eb' }}
                          >
                            <i className="fa-solid fa-pen-to-square" style={{ fontSize: '12px' }} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Xóa giảng viên"
                            onClick={() => setDeleteTarget(gv)}
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
              Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, total)} trong tổng số {total} giảng viên
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

      {/* Modal Thêm Giảng Viên */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => !submitting && setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-user-plus" style={{ color: 'var(--primary)' }} />
                Thêm Giảng Viên Mới
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
                      Mã giảng viên <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      required
                      placeholder="VD: GV001"
                      value={formData.code}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
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
                      placeholder="VD: gv.a@university.edu.vn"
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
                      type="text"
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
                      Khoa / Bộ môn <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Công nghệ thông tin">Công nghệ thông tin</option>
                      <option value="Toán">Toán</option>
                      <option value="Vật lý">Vật lý</option>
                      <option value="Hóa học">Hóa học</option>
                      <option value="Kinh tế">Kinh tế</option>
                      <option value="Ngoại ngữ">Ngoại ngữ</option>
                    </select>
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
                      Trạng thái
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Đang làm">Đang làm</option>
                      <option value="Nghỉ việc">Nghỉ việc</option>
                    </select>
                  </div>

                  <div>
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

      {/* Modal Chỉnh Sửa Hồ Sơ Giảng Viên */}
      {editingTeacher && createPortal(
        <div className="modal-overlay" onClick={() => !editSubmitting && setEditingTeacher(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--primary)' }} />
                Chỉnh Sửa Hồ Sơ Giảng Viên
              </h3>
              <button
                className="modal-close"
                onClick={() => !editSubmitting && setEditingTeacher(null)}
                disabled={editSubmitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {editFormError && (
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
                    <span>{editFormError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Mã giảng viên <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      required
                      value={editFormData.code}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
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
                      value={editFormData.name}
                      onChange={handleEditFormChange}
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
                      value={editFormData.email}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="0912345678"
                      value={editFormData.phone}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Khoa / Bộ môn
                    </label>
                    <select
                      name="department"
                      value={editFormData.department}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Công nghệ thông tin">Công nghệ thông tin</option>
                      <option value="Toán">Toán</option>
                      <option value="Vật lý">Vật lý</option>
                      <option value="Hóa học">Hóa học</option>
                      <option value="Kinh tế">Kinh tế</option>
                      <option value="Ngoại ngữ">Ngoại ngữ</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Giới tính
                    </label>
                    <select
                      name="gender"
                      value={editFormData.gender}
                      onChange={handleEditFormChange}
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
                      Trạng thái công tác (Vô hiệu hóa)
                    </label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{ width: '100%', fontWeight: 600, color: editFormData.status === 'Nghỉ việc' ? '#dc2626' : '#059669' }}
                    >
                      <option value="Đang làm">🟢 Đang làm (Hoạt động)</option>
                      <option value="Nghỉ việc">🔴 Nghỉ việc (Vô hiệu hóa)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Đổi mật khẩu mới (Nếu cần)
                    </label>
                    <input
                      type="text"
                      name="password"
                      placeholder="Để trống nếu không đổi"
                      value={editFormData.password}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingTeacher(null)}
                  disabled={editSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {editSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk" /> Lưu Thay Đổi
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
                Xác Nhận Xóa Giảng Viên
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
                Bạn có chắc chắn muốn xóa giảng viên <strong>{deleteTarget.name}</strong> (Mã GV: <span style={{ fontFamily: 'monospace', color: 'var(--accent-purple)' }}>{deleteTarget.code}</span>) khỏi hệ thống?
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
                <span>Hành động này sẽ xóa dữ liệu giảng viên vĩnh viễn và không thể khôi phục.</span>
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

      {/* Modal Xem Hồ Sơ Chi Tiết Giảng Viên */}
      {viewingTeacher && createPortal(
        <div className="modal-overlay" onClick={() => setViewingTeacher(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-id-card" style={{ color: 'var(--primary)' }} />
                Hồ Sơ Chi Tiết Giảng Viên
              </h3>
              <button className="modal-close" onClick={() => setViewingTeacher(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
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
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '22px',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
                }}>
                  {viewingTeacher.name?.charAt(0)?.toUpperCase() || 'G'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {viewingTeacher.name}
                    </h4>
                    <span className={`badge ${viewingTeacher.status === 'Nghỉ việc' ? 'badge-danger' : 'badge-success'}`}>
                      {viewingTeacher.status || 'Đang làm'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-purple)', fontSize: '13px' }}>
                      {viewingTeacher.code}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      Khoa: <strong style={{ color: 'var(--text-main)' }}>{viewingTeacher.department || '—'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Mã Giảng Viên
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-purple)' }}>
                    {viewingTeacher.code}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Mật Khẩu Đăng Nhập
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace', color: viewModalShowPass ? 'var(--primary)' : 'var(--text-main)', letterSpacing: viewModalShowPass ? '0.5px' : '2px' }}>
                      {viewModalShowPass ? (viewingTeacher.plainPassword || '123456') : '••••••'}
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
                    {viewingTeacher.email}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Số Điện Thoại
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingTeacher.phone || '— Chưa cập nhật'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Khoa / Bộ Môn
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingTeacher.department || 'Công nghệ thông tin'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Giới Tính
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingTeacher.gender || 'Nam'}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Trạng Thái Công Tác
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: viewingTeacher.status === 'Nghỉ việc' ? '#dc2626' : '#059669' }}>
                    {viewingTeacher.status || 'Đang làm'}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingTeacher(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const teacherToEdit = viewingTeacher;
                  setViewingTeacher(null);
                  handleOpenEdit(teacherToEdit);
                }}
              >
                <i className="fa-solid fa-pen-to-square" /> Chỉnh Sửa Hồ Sơ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Teachers;
