import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';

const SEMESTER_OPTIONS = [
  'HK1-2026-2027',
  'HK2-2026-2027',
  'HK3-2026-2027 (Hè)',
  'HK1-2025-2026',
  'HK2-2025-2026'
];

const SHIFT_OPTIONS = [
  'Ca 1 (07:00 - 09:30)',
  'Ca 2 (09:45 - 12:15)',
  'Ca 3 (13:00 - 15:30)',
  'Ca 4 (15:45 - 18:15)',
  'Ca tối (18:30 - 21:00)'
];

const DAY_OPTIONS = [
  { val: 2, label: 'Thứ 2' },
  { val: 3, label: 'Thứ 3' },
  { val: 4, label: 'Thứ 4' },
  { val: 5, label: 'Thứ 5' },
  { val: 6, label: 'Thứ 6' },
  { val: 7, label: 'Thứ 7' },
  { val: 8, label: 'Chủ Nhật' },
];

const initialSectionForm = {
  sectionCode: '',
  course: '',
  teacher: '',
  semester: 'HK1-2026-2027',
  academicYear: '2026-2027',
  maxStudents: 50,
  room: 'A201',
  dayOfWeek: 2,
  shift: 'Ca 1 (07:00 - 09:30)',
  isOpen: true
};

const CourseClasses = () => {
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('HK1-2026-2027');
  const [loading, setLoading] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingFeedback, setEditingFeedback] = useState('');
  const [editingStatus, setEditingStatus] = useState('pending');
  const [formData, setFormData] = useState(initialSectionForm);
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [secRes, courseRes, teacherRes] = await Promise.all([
        api.getClassSections(selectedSemester),
        api.getCourses(),
        api.getUsers('teacher')
      ]);

      if (secRes.success) setSections(secRes.data || []);
      if (courseRes.success) setCourses(courseRes.data || []);
      if (teacherRes.success) setTeachers(teacherRes.data || teacherRes.users || []);
    } catch {
      showToast('Lỗi khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedSemester]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setEditingFeedback('');
    setEditingStatus('pending');
    setFormData({
      ...initialSectionForm,
      semester: selectedSemester,
      course: courses[0]?._id || '',
      teacher: teachers[0]?._id || ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sec) => {
    setEditingId(sec._id);
    setEditingFeedback(sec.teacherFeedback || '');
    setEditingStatus(sec.teacherApprovalStatus || 'pending');
    setFormData({
      sectionCode: sec.sectionCode,
      course: sec.course?._id || sec.course,
      teacher: sec.teacher?._id || sec.teacher,
      semester: sec.semester || selectedSemester,
      academicYear: sec.academicYear || '2026-2027',
      maxStudents: sec.maxStudents || 50,
      room: sec.room || 'A201',
      dayOfWeek: sec.dayOfWeek || 2,
      shift: sec.shift || 'Ca 1 (07:00 - 09:30)',
      isOpen: sec.isOpen !== undefined ? sec.isOpen : true,
      resetApproval: sec.teacherApprovalStatus === 'rejected'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sectionCode || !formData.course || !formData.teacher) {
      showToast('Vui lòng điền đủ mã lớp, môn học và giảng viên', 'error');
      return;
    }

    setSubmitting(true);
    let res;
    if (editingId) {
      res = await api.updateClassSection(editingId, formData);
    } else {
      res = await api.createClassSection(formData);
    }
    setSubmitting(false);

    if (res.success) {
      showToast(res.message || 'Lưu lớp học phần thành công');
      setShowModal(false);
      loadData();
    } else {
      showToast(res.message || 'Thao tác thất bại', 'error');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lớp học phần "${code}"?`)) return;
    const res = await api.deleteClassSection(id);
    if (res.success) {
      showToast(`Đã xóa lớp học phần "${code}"`);
      loadData();
    } else {
      showToast(res.message || 'Lỗi khi xóa', 'error');
    }
  };

  const handleToggleOpen = async (sec) => {
    const res = await api.updateClassSection(sec._id, { isOpen: !sec.isOpen });
    if (res.success) {
      showToast(`Đã ${!sec.isOpen ? 'mở' : 'đóng'} đăng ký lớp "${sec.sectionCode}"`);
      loadData();
    } else {
      showToast('Lỗi cập nhật trạng thái', 'error');
    }
  };

  return (
    <div className="animate-in" style={{ position: 'relative' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 999999,
          background: toast.type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff', padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px'
        }}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="section-card" style={{ marginBottom: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-calendar-check" style={{ color: 'var(--primary)' }}></i>
              Quản Lý Học Phần & Phân Công Giảng Dạy
            </h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted)' }}>
              Tạo lớp học phần theo từng học kỳ, chỉ định môn học, phân công giảng viên phụ trách và sắp xếp lịch học.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Học Kỳ:</span>
              <select
                className="form-control"
                value={selectedSemester}
                onChange={e => setSelectedSemester(e.target.value)}
                style={{ fontWeight: 700, color: 'var(--primary)', padding: '8px 12px' }}
              >
                {SEMESTER_OPTIONS.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <i className="fa-solid fa-plus"></i> Mở Lớp Học Phần Mới
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách lớp học phần */}
      <div className="section-card" style={{ padding: '24px' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Lớp Học Phần</th>
                <th>Môn Học</th>
                <th style={{ textAlign: 'center' }}>Số Tín Chỉ</th>
                <th>Giảng Viên Phụ Trách</th>
                <th>Lịch Học (Thứ / Ca / Phòng)</th>
                <th>Xác Nhận Giảng Viên</th>
                <th style={{ textAlign: 'center' }}>Sĩ Số</th>
                <th style={{ textAlign: 'center' }}>Đăng Ký</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>Đang tải danh sách học phần...</td></tr>
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '35px', color: 'var(--text-muted)' }}>
                    Chưa có lớp học phần nào mở trong {selectedSemester}. Bấm "Mở Lớp Học Phần Mới" để tạo.
                  </td>
                </tr>
              ) : (
                sections.map(sec => {
                  const studentCount = sec.students?.length || 0;
                  const isFull = studentCount >= (sec.maxStudents || 50);

                  return (
                    <tr key={sec._id}>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '13.5px' }}>
                          {sec.sectionCode}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {sec.course?.name || 'Chưa gán môn'}
                        </div>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {sec.course?.code}
                        </span>
                      </td>

                      {/* Cột Số Tín Chỉ đồng bộ */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 12px', borderRadius: '16px',
                          background: 'rgba(37,99,235,0.12)', color: '#2563eb',
                          fontWeight: 800, fontSize: '13px'
                        }}>
                          {sec.course?.credits || 3} Tín chỉ
                        </span>
                      </td>

                      <td>
                        {sec.teacher ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #059669, #10b981)',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 700
                            }}>
                              {sec.teacher.name?.charAt(0) || 'G'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>{sec.teacher.name}</div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {sec.teacher.code}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '12px' }}>Chưa phân công</span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                          <i className="fa-regular fa-calendar" style={{ color: 'var(--primary)', marginRight: '5px' }}></i>
                          Thứ {sec.dayOfWeek === 8 ? 'CN' : sec.dayOfWeek}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {sec.shift} — <strong>Phòng {sec.room}</strong>
                        </div>
                      </td>

                      {/* Cột Xác Nhận Giảng Viên */}
                      <td>
                        {sec.teacherApprovalStatus === 'accepted' ? (
                          <div>
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px' }}>
                              <i className="fa-solid fa-check"></i> Đã Duyệt (Hiện trên SV)
                            </span>
                          </div>
                        ) : sec.teacherApprovalStatus === 'rejected' ? (
                          <div>
                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px' }}>
                              <i className="fa-solid fa-triangle-exclamation"></i> GV Từ Chối
                            </span>
                            {sec.teacherFeedback && (
                              <div style={{
                                marginTop: '4px', padding: '4px 8px', borderRadius: '6px',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                                color: '#b91c1c', fontSize: '11px', maxWidth: '210px', lineHeight: 1.3
                              }}>
                                <strong>Đề xuất:</strong> {sec.teacherFeedback}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px' }}>
                              <i className="fa-solid fa-clock"></i> Chờ GV Duyệt (Chưa hiện SV)
                            </span>
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700, fontSize: '12.5px',
                          color: isFull ? '#ef4444' : '#059669'
                        }}>
                          {studentCount} / {sec.maxStudents || 50}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleOpen(sec)}
                          style={{
                            border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '11.5px', fontWeight: 700,
                            color: sec.isOpen ? '#059669' : '#94a3b8'
                          }}
                          title="Bấm để đóng/mở đăng ký"
                        >
                          <i className={`fa-solid ${sec.isOpen ? 'fa-toggle-on' : 'fa-toggle-off'}`} style={{ fontSize: '20px', verticalAlign: 'middle', marginRight: '4px' }}></i>
                          {sec.isOpen ? 'Đang mở' : 'Đã đóng'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            className="btn-action edit"
                            title="Sửa phân công / Lịch học"
                            onClick={() => handleOpenEdit(sec)}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            className="btn-action delete"
                            title="Xóa lớp học phần"
                            onClick={() => handleDelete(sec._id, sec.sectionCode)}
                          >
                            <i className="fa-solid fa-trash-can"></i>
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
      </div>

      {/* MODAL MỞ / SỬA HỌC PHẦN */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => !submitting && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-calendar-plus" style={{ color: 'var(--primary)' }}></i>
                {editingId ? 'Chỉnh Sửa Phân Công Học Phần' : 'Mở Lớp Học Phần & Phân Công Giảng Viên'}
              </h3>
              <button className="modal-close" onClick={() => !submitting && setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {editingStatus === 'rejected' && (
                  <div style={{
                    padding: '12px 14px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    color: '#b91c1c', fontSize: '12.5px', marginBottom: '16px'
                  }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <i className="fa-solid fa-triangle-exclamation"></i> Giảng viên đã từ chối lịch trước đó:
                    </div>
                    <div style={{ fontStyle: 'italic' }}>"{editingFeedback || 'Không có ghi chú cụ thể'}"</div>
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#7f1d1d' }}>
                      👉 Hãy điều chỉnh lại Thứ / Ca / Phòng theo đề xuất của Giảng viên. Khi bạn lưu lại, hệ thống sẽ tự động gửi lại lịch mới cho Giảng viên xác nhận!
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Mã lớp học phần <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                      placeholder="VD: LHP_IT101_01"
                      required
                      disabled={!!editingId}
                      value={formData.sectionCode}
                      onChange={e => setFormData({ ...formData, sectionCode: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Học kỳ mở lớp <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%' }}
                      value={formData.semester}
                      onChange={e => setFormData({ ...formData, semester: e.target.value })}
                    >
                      {SEMESTER_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Chọn môn học <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%', fontWeight: 600 }}
                      required
                      value={formData.course}
                      onChange={e => setFormData({ ...formData, course: e.target.value })}
                    >
                      <option value="">-- Chọn môn học --</option>
                      {courses.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.code} — {c.name} ({c.credits} Tín chỉ)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Phân công Giảng viên phụ trách <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%', fontWeight: 600 }}
                      required
                      value={formData.teacher}
                      onChange={e => setFormData({ ...formData, teacher: e.target.value })}
                    >
                      <option value="">-- Chọn giảng viên --</option>
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.code} — {t.name} ({t.department || 'Khoa CNTT'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Thứ trong tuần
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%' }}
                      value={formData.dayOfWeek}
                      onChange={e => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                    >
                      {DAY_OPTIONS.map(d => (
                        <option key={d.val} value={d.val}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Ca học
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%' }}
                      value={formData.shift}
                      onChange={e => setFormData({ ...formData, shift: e.target.value })}
                    >
                      {SHIFT_OPTIONS.map(sh => (
                        <option key={sh} value={sh}>{sh}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Phòng học
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%' }}
                      placeholder="VD: A201"
                      value={formData.room}
                      onChange={e => setFormData({ ...formData, room: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Sĩ số tối đa
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="200"
                      className="form-control"
                      style={{ width: '100%' }}
                      value={formData.maxStudents}
                      onChange={e => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={formData.isOpen}
                        onChange={e => setFormData({ ...formData, isOpen: e.target.checked })}
                      />
                      <span>Mở đăng ký ngay cho sinh viên trong đợt này</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : (editingId ? 'Cập Nhật Phân Công' : 'Xác Nhận Mở Lớp')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CourseClasses;
