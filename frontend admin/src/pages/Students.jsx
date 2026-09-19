import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';

const STATUSES = {
  'active': { label: 'Đang học', cls: 'badge-success' },
  'Đang học': { label: 'Đang học', cls: 'badge-success' },
  'graduated': { label: 'Đã tốt nghiệp', cls: 'badge-info' },
  'Tốt nghiệp': { label: 'Đã tốt nghiệp', cls: 'badge-info' },
  'Đã tốt nghiệp': { label: 'Đã tốt nghiệp', cls: 'badge-info' },
  'suspended': { label: 'Tạm dừng học', cls: 'badge-danger' },
  'Đình chỉ': { label: 'Tạm dừng học', cls: 'badge-danger' },
  'Tạm dừng học': { label: 'Tạm dừng học', cls: 'badge-danger' },
  'on_leave': { label: 'Bảo lưu hồ sơ', cls: 'badge-warning' },
  'Bảo lưu': { label: 'Bảo lưu hồ sơ', cls: 'badge-warning' },
  'Bảo lưu hồ sơ': { label: 'Bảo lưu hồ sơ', cls: 'badge-warning' },
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

  // Add Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Modal states
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({ ...initialForm, password: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState('');

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

  const totalPages = Math.ceil(total / limit);

  // Handle Add Student
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
      setFormError('Vui lòng điền đầy đủ Mã SV, Họ tên và Email');
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

  // Handle Open Edit Modal
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setEditFormData({
      code: student.code || '',
      name: student.name || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      classCode: student.class || student.classCode || 'K17-CNTT01',
      major: student.major || 'Kỹ thuật phần mềm',
      department: student.department || 'Công nghệ thông tin',
      academicYear: student.academicYear || '2023-2027',
      gender: student.gender || 'Nam',
      status: student.status || 'Đang học',
      dateOfBirth: student.dateOfBirth || ''
    });
    setEditFormError('');
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditFormError('');

    if (!editFormData.code.trim() || !editFormData.name.trim() || !editFormData.email.trim()) {
      setEditFormError('Vui lòng điền đầy đủ Mã SV, Họ tên và Email');
      return;
    }

    if (editFormData.phone && !/^0[0-9]{9}$/.test(editFormData.phone)) {
      setEditFormError('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0');
      return;
    }

    setEditSubmitting(true);
    const res = await api.updateUser(editingStudent._id, editFormData);
    setEditSubmitting(false);

    if (res.success) {
      setEditingStudent(null);
      showToast(`✏️ Đã cập nhật hồ sơ sinh viên "${editFormData.name}" thành công!`);
      fetchStudents();
    } else {
      setEditFormError(res.message || 'Lỗi khi cập nhật hồ sơ sinh viên');
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

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '300px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-light)', fontSize: '13px'
            }} />
            <input
              type="text"
              className="form-control"
              placeholder="Tìm tên, MSSV, email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '34px' }}
            />
          </div>

          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '160px' }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Đang học">Đang học</option>
            <option value="Bảo lưu hồ sơ">Bảo lưu hồ sơ</option>
            <option value="Tạm dừng học">Tạm dừng học</option>
            <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
          </select>

          <button className="btn btn-secondary btn-icon" onClick={fetchStudents} title="Làm mới">
            <i className="fa-solid fa-rotate-right" style={{ fontSize: '13px' }} />
          </button>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>MSSV</th>
                <th>Họ Tên</th>
                <th>Mật Khẩu</th>
                <th>Email</th>
                <th>Lớp</th>
                <th>Chuyên Ngành</th>
                <th>Trạng Thái Hồ Sơ</th>
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
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="empty-state">
                      <i className="fa-solid fa-user-slash" />
                      <p>
                        {search || statusFilter
                          ? 'Không tìm thấy sinh viên khớp với điều kiện.'
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
                  const st = STATUSES[sv.status] || { label: sv.status || 'Đang học', cls: 'badge-success' };

                  return (
                    <tr key={sv._id || i}>
                      <td style={{ color: 'var(--text-light)', fontSize: '12px' }}>{(page - 1) * limit + i + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '12.5px' }}>
                          {sv.code || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={sv.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                            alt=""
                            style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <span
                            onClick={() => { setViewingStudent(sv); setViewModalShowPass(false); }}
                            style={{ fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.target.style.color = 'var(--primary)'}
                            onMouseLeave={e => e.target.style.color = 'var(--text-main)'}
                            title="Bấm để xem hồ sơ chi tiết"
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
                            title="Chỉnh sửa hồ sơ"
                            onClick={() => handleOpenEdit(sv)}
                            style={{ color: '#2563eb' }}
                          >
                            <i className="fa-solid fa-pen-to-square" style={{ fontSize: '12px' }} />
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
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
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
                      Mã sinh viên (MSSV) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      required
                      placeholder="VD: 20012345"
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
                      placeholder="VD: sv.a@university.edu.vn"
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
                      Lớp sinh hoạt
                    </label>
                    <input
                      type="text"
                      name="classCode"
                      placeholder="VD: K17-CNTT01"
                      value={formData.classCode}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Chuyên ngành
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
                      Trạng thái hồ sơ
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Đang học">🟢 Đang học</option>
                      <option value="Bảo lưu hồ sơ">🟡 Bảo lưu hồ sơ</option>
                      <option value="Tạm dừng học">🔴 Tạm dừng học (Vô hiệu hóa)</option>
                      <option value="Đã tốt nghiệp">🔵 Đã tốt nghiệp</option>
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

      {/* Modal Chỉnh Sửa Hồ Sơ Sinh Viên */}
      {editingStudent && createPortal(
        <div className="modal-overlay" onClick={() => !editSubmitting && setEditingStudent(null)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--primary)' }} />
                Chỉnh Sửa Hồ Sơ Sinh Viên
              </h3>
              <button
                className="modal-close"
                onClick={() => !editSubmitting && setEditingStudent(null)}
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
                      Mã sinh viên (MSSV) <span style={{ color: '#ef4444' }}>*</span>
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
                      Lớp sinh hoạt
                    </label>
                    <input
                      type="text"
                      name="classCode"
                      value={editFormData.classCode}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Chuyên ngành
                    </label>
                    <input
                      type="text"
                      name="major"
                      value={editFormData.major}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Trạng thái hồ sơ (Vô hiệu hóa)
                    </label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditFormChange}
                      className="form-control"
                      style={{
                        width: '100%',
                        fontWeight: 600,
                        color: editFormData.status === 'Tạm dừng học' ? '#dc2626' : editFormData.status === 'Bảo lưu hồ sơ' ? '#b45309' : '#059669'
                      }}
                    >
                      <option value="Đang học">🟢 Đang học (Hoạt động)</option>
                      <option value="Bảo lưu hồ sơ">🟡 Bảo lưu hồ sơ</option>
                      <option value="Tạm dừng học">🔴 Tạm dừng học (Vô hiệu hóa)</option>
                      <option value="Đã tốt nghiệp">🔵 Đã tốt nghiệp</option>
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
                  onClick={() => setEditingStudent(null)}
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
                Bạn có chắc chắn muốn xóa sinh viên <strong>{deleteTarget.name}</strong> (MSSV: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{deleteTarget.code}</span>) khỏi hệ thống?
              </p>
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
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-id-card" style={{ color: 'var(--primary)' }} />
                Hồ Sơ Chi Tiết Sinh Viên
              </h3>
              <button className="modal-close" onClick={() => setViewingStudent(null)}>✕</button>
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
                <img
                  src={viewingStudent.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                  alt=""
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--primary)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {viewingStudent.name}
                    </h4>
                    <span className={`badge ${(STATUSES[viewingStudent.status] || { cls: 'badge-success' }).cls}`}>
                      {(STATUSES[viewingStudent.status] || { label: viewingStudent.status || 'Đang học' }).label}
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
                    Lớp Sinh Hoạt
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.class || viewingStudent.classCode || '—'}
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
                    Khoa / Viện
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {viewingStudent.department || 'Công nghệ thông tin'}
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
                    Trạng Thái Hồ Sơ
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {(STATUSES[viewingStudent.status] || { label: viewingStudent.status || 'Đang học' }).label}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingStudent(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const studentToEdit = viewingStudent;
                  setViewingStudent(null);
                  handleOpenEdit(studentToEdit);
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

export default Students;
