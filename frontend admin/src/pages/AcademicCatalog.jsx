import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';

const AcademicCatalog = () => {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'curriculums' | 'majors'

  // Data states
  const [courses, setCourses] = useState([]);
  const [majors, setMajors] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states - Course
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    credits: 3,
    department: 'Công nghệ thông tin',
    description: '',
    tuitionFeePerCredit: 450000
  });

  // Form states - Major
  const [showMajorModal, setShowMajorModal] = useState(false);
  const [majorForm, setMajorForm] = useState({
    code: '',
    name: '',
    department: 'Công nghệ thông tin',
    description: ''
  });

  // Form states - Curriculum
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [curriculumForm, setCurriculumForm] = useState({
    major: '',
    name: '',
    academicYear: '2023-2027'
  });

  // Add course to semester modal state
  const [addCourseTarget, setAddCourseTarget] = useState(null); // { curriculumId, semesterIndex, semesterName }
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resC, resM, resCurr] = await Promise.all([
        api.getCourses(),
        api.getMajors(),
        api.getCurriculums()
      ]);
      if (resC.success) setCourses(resC.data || []);
      if (resM.success) setMajors(resM.data || []);
      if (resCurr.success) setCurriculums(resCurr.data || []);
    } catch {
      showToast('Lỗi khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Course
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.code || !courseForm.name) {
      showToast('Vui lòng điền đủ mã và tên môn học', 'error');
      return;
    }
    const res = await api.createCourse(courseForm);
    if (res.success) {
      showToast(`Đã thêm môn học "${courseForm.name}" (${courseForm.credits} tín chỉ)`);
      setShowCourseModal(false);
      setCourseForm({ code: '', name: '', credits: 3, department: 'Công nghệ thông tin', description: '', tuitionFeePerCredit: 450000 });
      loadData();
    } else {
      showToast(res.message || 'Lỗi thêm môn học', 'error');
    }
  };

  const handleDeleteCourse = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa môn học "${name}"?`)) return;
    const res = await api.deleteCourse(id);
    if (res.success) {
      showToast(`Đã xóa môn học "${name}"`);
      loadData();
    } else {
      showToast(res.message || 'Lỗi xóa môn học', 'error');
    }
  };

  // Handle Major
  const handleSaveMajor = async (e) => {
    e.preventDefault();
    if (!majorForm.code || !majorForm.name) {
      showToast('Vui lòng nhập mã ngành và tên ngành', 'error');
      return;
    }
    const res = await api.createMajor(majorForm);
    if (res.success) {
      showToast(`Đã thêm ngành "${majorForm.name}"`);
      setShowMajorModal(false);
      setMajorForm({ code: '', name: '', department: 'Công nghệ thông tin', description: '' });
      loadData();
    } else {
      showToast(res.message || 'Lỗi thêm ngành', 'error');
    }
  };

  const handleDeleteMajor = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ngành "${name}"?`)) return;
    const res = await api.deleteMajor(id);
    if (res.success) {
      showToast(`Đã xóa ngành "${name}"`);
      loadData();
    } else {
      showToast(res.message || 'Lỗi xóa ngành', 'error');
    }
  };

  // Handle Curriculum
  const handleSaveCurriculum = async (e) => {
    e.preventDefault();
    if (!curriculumForm.major || !curriculumForm.name) {
      showToast('Vui lòng chọn ngành và nhập tên chương trình', 'error');
      return;
    }
    const res = await api.createCurriculum(curriculumForm);
    if (res.success) {
      showToast(`Đã tạo chương trình đào tạo "${curriculumForm.name}"`);
      setShowCurriculumModal(false);
      setCurriculumForm({ major: '', name: '', academicYear: '2023-2027' });
      loadData();
    } else {
      showToast(res.message || 'Lỗi tạo CTĐT', 'error');
    }
  };

  // Toggle Visibility for a semester
  const handleToggleVisibility = async (curriculumId, semIndex, currentStatus) => {
    const res = await api.toggleSemesterVisibility(curriculumId, semIndex, !currentStatus);
    if (res.success) {
      showToast(res.message || 'Đã cập nhật trạng thái hiển thị');
      loadData();
    } else {
      showToast(res.message || 'Lỗi cập nhật hiển thị', 'error');
    }
  };

  // Add course to semester
  const handleAddCourseToSemester = async (e) => {
    e.preventDefault();
    if (!addCourseTarget || !selectedCourseToAdd) return;
    const res = await api.addCourseToSemester(addCourseTarget.curriculumId, addCourseTarget.semesterIndex, selectedCourseToAdd);
    if (res.success) {
      showToast('Đã thêm môn học vào học kỳ thành công!');
      setAddCourseTarget(null);
      setSelectedCourseToAdd('');
      loadData();
    } else {
      showToast(res.message || 'Lỗi khi thêm môn học', 'error');
    }
  };

  // Remove course from semester
  const handleRemoveCourseFromSemester = async (curriculumId, semesterIndex, courseId, courseName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa môn "${courseName}" khỏi học kỳ này?`)) return;
    const res = await api.removeCourseFromSemester(curriculumId, semesterIndex, courseId);
    if (res.success) {
      showToast(`Đã xóa môn "${courseName}" khỏi học kỳ`);
      loadData();
    } else {
      showToast(res.message || 'Lỗi khi xóa môn học', 'error');
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
              <i className="fa-solid fa-book-bookmark" style={{ color: 'var(--primary)' }}></i>
              Quản Lý Danh Mục & Chương Trình Đào Tạo
            </h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted)' }}>
              Quản lý ngành học, môn học (số tín chỉ) và cấu hình bật/tắt hiển thị chương trình học theo kỳ cho sinh viên.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`btn ${activeTab === 'courses' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('courses')}
            >
              <i className="fa-solid fa-book-open"></i> Môn Học ({courses.length})
            </button>
            <button
              className={`btn ${activeTab === 'curriculums' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('curriculums')}
            >
              <i className="fa-solid fa-graduation-cap"></i> Chương Trình Đào Tạo ({curriculums.length})
            </button>
            <button
              className={`btn ${activeTab === 'majors' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('majors')}
            >
              <i className="fa-solid fa-diagram-project"></i> Ngành Học ({majors.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MÔN HỌC (COURSES) */}
      {activeTab === 'courses' && (
        <div className="section-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Danh Sách Môn Học Toàn Trường
              </h3>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Số tín chỉ được thiết lập tại đây sẽ được đồng bộ hiển thị sang Cổng Sinh Viên và Cổng Giảng Viên.
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCourseModal(true)}>
              <i className="fa-solid fa-plus"></i> Thêm Môn Học Mới
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Môn</th>
                  <th>Tên Môn Học</th>
                  <th style={{ textAlign: 'center' }}>Số Tín Chỉ</th>
                  <th>Khoa / Bộ Môn</th>
                  <th>Học Phí / Tín Chỉ</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Đang tải dữ liệu...</td></tr>
                ) : courses.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Chưa có môn học nào. Bấm "Thêm Môn Học Mới" để tạo.</td></tr>
                ) : (
                  courses.map(course => (
                    <tr key={course._id}>
                      <td><span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{course.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{course.name}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 12px', borderRadius: '20px',
                          background: 'rgba(37,99,235,0.1)', color: '#2563eb',
                          fontWeight: 800, fontSize: '13px'
                        }}>
                          {course.credits} Tín chỉ
                        </span>
                      </td>
                      <td>{course.department}</td>
                      <td>{course.tuitionFeePerCredit?.toLocaleString('vi-VN')} đ</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-action delete"
                          title="Xóa môn học"
                          onClick={() => handleDeleteCourse(course._id, course.name)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CHƯƠNG TRÌNH ĐÀO TẠO & HIỂN THỊ THEO KỲ */}
      {activeTab === 'curriculums' && (
        <div className="section-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Chương Trình Đào Tạo Theo Ngành & Cấu Hình Hiển Thị
              </h3>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Admin có thể chủ động lựa chọn bật/tắt hiển thị từng học kỳ để sinh viên theo dõi và định hướng đăng ký học phần.
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCurriculumModal(true)}>
              <i className="fa-solid fa-plus"></i> Tạo Chương Trình Mới
            </button>
          </div>

          {curriculums.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Chưa có chương trình đào tạo nào. Hãy tạo chương trình đào tạo cho ngành học!
            </div>
          ) : (
            curriculums.map(curr => (
              <div key={curr._id} style={{
                marginBottom: '28px', border: '1px solid var(--border-color)',
                borderRadius: '14px', overflow: 'hidden', background: '#fff'
              }}>
                <div style={{
                  padding: '16px 20px', background: 'var(--bg-hover)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {curr.name} — Khóa {curr.academicYear}
                    </h4>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Ngành: <strong style={{ color: 'var(--primary)' }}>{curr.major?.name || '—'}</strong> ({curr.major?.code})
                    </span>
                  </div>
                  <span className="badge badge-primary">8 Học Kỳ Chuẩn</span>
                </div>

                {/* Danh sách 8 học kỳ */}
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {curr.semesters?.map(sem => (
                    <div key={sem.semesterIndex} style={{
                      padding: '16px', borderRadius: '12px',
                      border: `1.5px solid ${sem.isVisible ? '#3b82f6' : '#e2e8f0'}`,
                      background: sem.isVisible ? 'rgba(59, 130, 246, 0.03)' : '#f8fafc',
                      display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '14.5px', color: 'var(--text-main)' }}>
                          {sem.semesterName || `Học kỳ ${sem.semesterIndex}`}
                        </strong>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                          background: sem.isVisible ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                          color: sem.isVisible ? '#059669' : '#64748b'
                        }}>
                          {sem.isVisible ? 'Đang hiển thị' : 'Đang ẩn'}
                        </span>
                      </div>

                      {/* Danh sách môn học trong kỳ */}
                      <div style={{
                        minHeight: '85px', maxHeight: '160px', overflowY: 'auto',
                        padding: '8px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0',
                        display: 'flex', flexDirection: 'column', gap: '6px'
                      }}>
                        {(!sem.courses || sem.courses.length === 0) ? (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                            Chưa có môn học nào trong kỳ này
                          </div>
                        ) : (
                          sem.courses.map(c => (
                            <div key={c._id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '6px 8px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #f1f5f9', fontSize: '12px'
                            }}>
                              <div style={{ minWidth: 0, flex: 1, paddingRight: '6px' }}>
                                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {c.name}
                                </div>
                                <span style={{ fontSize: '10.5px', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                                  {c.code} ({c.credits} Tín chỉ)
                                </span>
                              </div>
                              <button
                                type="button"
                                title="Xóa môn khỏi kỳ"
                                onClick={() => handleRemoveCourseFromSemester(curr._id, sem.semesterIndex, c._id, c.name)}
                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px', fontSize: '12px' }}
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Nút thêm môn vào kỳ này */}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}
                        onClick={() => {
                          setAddCourseTarget({
                            curriculumId: curr._id,
                            semesterIndex: sem.semesterIndex,
                            semesterName: sem.semesterName || `Học kỳ ${sem.semesterIndex}`
                          });
                          setSelectedCourseToAdd('');
                        }}
                      >
                        <i className="fa-solid fa-plus"></i> Thêm Môn Vào Kỳ Này
                      </button>

                      {/* Nút bật/tắt hiển thị */}
                      <button
                        type="button"
                        className={`btn btn-sm ${sem.isVisible ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
                        onClick={() => handleToggleVisibility(curr._id, sem.semesterIndex, sem.isVisible)}
                      >
                        <i className={`fa-solid ${sem.isVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        {sem.isVisible ? 'Ẩn Với Sinh Viên' : 'Bật Hiển Thị Cho Sinh Viên'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: NGÀNH HỌC (MAJORS) */}
      {activeTab === 'majors' && (
        <div className="section-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Danh Mục Ngành Đào Tạo
              </h3>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Quản lý mã ngành và các ngành học thuộc trường.
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => setShowMajorModal(true)}>
              <i className="fa-solid fa-plus"></i> Thêm Ngành Học
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Ngành</th>
                  <th>Tên Ngành Học</th>
                  <th>Khoa Quản Lý</th>
                  <th>Mô Tả</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {majors.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>Chưa có ngành học nào.</td></tr>
                ) : (
                  majors.map(m => (
                    <tr key={m._id}>
                      <td><span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-purple)' }}>{m.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.department}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{m.description || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-action delete" onClick={() => handleDeleteMajor(m._id, m.name)}>
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL THÊM MÔN HỌC */}
      {showCourseModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-book-open" style={{ color: 'var(--primary)' }}></i> Thêm Môn Học Mới</h3>
              <button className="modal-close" onClick={() => setShowCourseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveCourse}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Mã môn học <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', textTransform: 'uppercase' }}
                      placeholder="VD: IT101"
                      required
                      value={courseForm.code}
                      onChange={e => setCourseForm({ ...courseForm, code: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Số tín chỉ <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="form-control"
                      style={{ width: '100%', fontWeight: 700, color: 'var(--primary)' }}
                      required
                      value={courseForm.credits}
                      onChange={e => setCourseForm({ ...courseForm, credits: Number(e.target.value) })}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Tên môn học <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%' }}
                      placeholder="VD: Lập trình Hướng đối tượng"
                      required
                      value={courseForm.name}
                      onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Khoa / Bộ môn
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%' }}
                      value={courseForm.department}
                      onChange={e => setCourseForm({ ...courseForm, department: e.target.value })}
                    >
                      <option value="Công nghệ thông tin">Công nghệ thông tin</option>
                      <option value="Toán">Toán</option>
                      <option value="Kinh tế">Kinh tế</option>
                      <option value="Ngoại ngữ">Ngoại ngữ</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Học phí / tín chỉ (VNĐ)
                    </label>
                    <input
                      type="number"
                      step="10000"
                      className="form-control"
                      style={{ width: '100%' }}
                      value={courseForm.tuitionFeePerCredit}
                      onChange={e => setCourseForm({ ...courseForm, tuitionFeePerCredit: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCourseModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-check"></i> Lưu Môn Học</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL THÊM NGÀNH HỌC */}
      {showMajorModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowMajorModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-diagram-project" style={{ color: 'var(--primary)' }}></i> Thêm Ngành Học</h3>
              <button className="modal-close" onClick={() => setShowMajorModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveMajor}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Mã ngành <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', textTransform: 'uppercase' }}
                      placeholder="VD: CNTT"
                      required
                      value={majorForm.code}
                      onChange={e => setMajorForm({ ...majorForm, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Tên ngành đào tạo <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%' }}
                      placeholder="VD: Công nghệ thông tin"
                      required
                      value={majorForm.name}
                      onChange={e => setMajorForm({ ...majorForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Khoa</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%' }}
                      value={majorForm.department}
                      onChange={e => setMajorForm({ ...majorForm, department: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMajorModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-check"></i> Lưu Ngành</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL TẠO CTĐT */}
      {showCurriculumModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCurriculumModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-graduation-cap" style={{ color: 'var(--primary)' }}></i> Tạo Chương Trình Đào Tạo Mới</h3>
              <button className="modal-close" onClick={() => setShowCurriculumModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveCurriculum}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Chọn ngành học <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%' }}
                      required
                      value={curriculumForm.major}
                      onChange={e => setCurriculumForm({ ...curriculumForm, major: e.target.value })}
                    >
                      <option value="">-- Chọn ngành học --</option>
                      {majors.map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Tên chương trình đào tạo <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%' }}
                      placeholder="VD: Chương trình Cử nhân Kỹ thuật Phần mềm"
                      required
                      value={curriculumForm.name}
                      onChange={e => setCurriculumForm({ ...curriculumForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Khóa đào tạo</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%' }}
                      placeholder="VD: 2023-2027"
                      value={curriculumForm.academicYear}
                      onChange={e => setCurriculumForm({ ...curriculumForm, academicYear: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCurriculumModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-check"></i> Tạo CTĐT (8 Học Kỳ)</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL THÊM MÔN VÀO HỌC KỲ */}
      {addCourseTarget && createPortal(
        <div className="modal-overlay" onClick={() => setAddCourseTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-plus-circle" style={{ color: 'var(--primary)' }}></i>
                Thêm Môn Học Vào {addCourseTarget.semesterName}
              </h3>
              <button className="modal-close" onClick={() => setAddCourseTarget(null)}>✕</button>
            </div>
            <form onSubmit={handleAddCourseToSemester}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    Chọn môn học để thêm vào học kỳ <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                    required
                    value={selectedCourseToAdd}
                    onChange={e => setSelectedCourseToAdd(e.target.value)}
                  >
                    <option value="">-- Chọn môn học từ danh mục --</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.code} — {c.name} ({c.credits} Tín chỉ)
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(59,130,246,0.06)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <i className="fa-solid fa-circle-info" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
                  Môn học được thêm vào học kỳ này sẽ được hiển thị trên Cổng Sinh Viên khi học kỳ được bật trạng thái hiển thị.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddCourseTarget(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  <i className="fa-solid fa-check"></i> Xác Nhận Thêm Môn
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

export default AcademicCatalog;
