import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

export default function TeacherEvaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  // Form State
  const [courseType, setCourseType] = useState('select'); // 'select' | 'manual'
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [manualCourseCode, setManualCourseCode] = useState('');
  const [manualCourseName, setManualCourseName] = useState('');

  const [studentTargetType, setStudentTargetType] = useState('ALL'); // 'ALL' | 'select' | 'manual'
  const [targetStudentId, setTargetStudentId] = useState('');
  const [targetStudentCode, setTargetStudentCode] = useState('');
  const [targetStudentName, setTargetStudentName] = useState('');

  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [evaluationPrompt, setEvaluationPrompt] = useState(
    'Đánh giá về phương pháp giảng dạy, sự tận tâm, giải đáp thắc mắc và sự công bằng trong kiểm tra đánh giá của giảng viên.'
  );

  // Modal xem chi tiết phản hồi
  const [viewingEval, setViewingEval] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evalRes, teacherRes, courseRes, studentRes] = await Promise.all([
        axios.get('/surveys'),
        axios.get('/theses/advisors').catch(() => ({ data: { data: [] } })),
        axios.get('/academic-mgmt/courses').catch(() => ({ data: { data: [] } })),
        axios.get('/students?limit=100').catch(() => ({ data: { data: [] } }))
      ]);

      if (evalRes.data && evalRes.data.success) {
        setEvaluations(evalRes.data.data || []);
      }

      if (teacherRes.data && teacherRes.data.data) {
        setTeachers(teacherRes.data.data || []);
        if (teacherRes.data.data.length > 0) {
          setSelectedTeacherId(teacherRes.data.data[0]._id);
        }
      }

      const cList = courseRes.data?.data || courseRes.data?.courses || [];
      setCourses(cList);
      if (cList.length > 0) {
        setSelectedCourseId(cList[0]._id);
      }

      const sList = studentRes.data?.data?.students || studentRes.data?.data || [];
      setStudents(sList);
    } catch (err) {
      console.error('Error loading evaluation data:', err);
      setAlert({ type: 'error', msg: 'Không thể tải dữ liệu: ' + (err.message || '') });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvaluation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert(null);

    let finalCourseCode = '';
    let finalCourseName = '';
    let finalCourseId = null;

    if (courseType === 'select') {
      const foundCourse = courses.find((c) => c._id === selectedCourseId);
      if (foundCourse) {
        finalCourseCode = foundCourse.code;
        finalCourseName = foundCourse.name;
        finalCourseId = foundCourse._id;
      }
    } else {
      finalCourseCode = manualCourseCode.trim();
      finalCourseName = manualCourseName.trim();
    }

    if (!finalCourseName) {
      setAlert({ type: 'error', msg: 'Vui lòng cung cấp đầy đủ thông tin tên môn học' });
      setSubmitting(false);
      return;
    }

    if (!selectedTeacherId) {
      setAlert({ type: 'error', msg: 'Vui lòng chọn giảng viên cần đánh giá' });
      setSubmitting(false);
      return;
    }

    let finalStudentCode = 'ALL';
    let finalStudentName = '';
    let finalStudentId = null;

    if (studentTargetType === 'select') {
      const foundStudent = students.find((s) => s._id === targetStudentId);
      if (foundStudent) {
        finalStudentCode = foundStudent.code || '';
        finalStudentName = foundStudent.name || '';
        finalStudentId = foundStudent._id;
      } else {
        setAlert({ type: 'error', msg: 'Vui lòng chọn sinh viên từ danh sách' });
        setSubmitting(false);
        return;
      }
    } else if (studentTargetType === 'manual') {
      finalStudentCode = targetStudentCode.trim().toUpperCase();
      finalStudentName = targetStudentName.trim();
      if (!finalStudentCode || !finalStudentName) {
        setAlert({ type: 'error', msg: 'Vui lòng nhập đầy đủ Mã sinh viên và Tên sinh viên' });
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      courseCode: finalCourseCode,
      courseName: finalCourseName,
      courseId: finalCourseId,
      targetStudentCode: finalStudentCode,
      targetStudentName: finalStudentName,
      targetStudentId: finalStudentId,
      teacherId: selectedTeacherId,
      evaluationPrompt: evaluationPrompt.trim(),
      minRating: 0,
      maxRating: 5
    };

    try {
      const res = await axios.post('/surveys', payload);
      if (res.data && res.data.success) {
        setAlert({
          type: 'success',
          msg: '🎉 Đã gửi phiếu đánh giá giảng viên lên hệ thống thành công! Phiếu đã hiển thị trên Cổng Sinh Viên.'
        });
        // Reset form
        if (studentTargetType !== 'ALL') {
          setTargetStudentCode('');
          setTargetStudentName('');
          setTargetStudentId('');
        }
        loadData();
      } else {
        setAlert({ type: 'error', msg: res.data?.message || 'Có lỗi xảy ra khi tạo đánh giá' });
      }
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (surveyId) => {
    try {
      const res = await axios.patch(`/surveys/${surveyId}/toggle`);
      if (res.data && res.data.success) {
        setAlert({ type: 'success', msg: res.data.message });
        loadData();
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Không thể cập nhật trạng thái' });
    }
  };

  const handleDeleteEvaluation = async (surveyId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đợt đánh giá này khỏi hệ thống?')) return;
    try {
      const res = await axios.delete(`/surveys/${surveyId}`);
      if (res.data && res.data.success) {
        setAlert({ type: 'success', msg: 'Đã xóa đợt đánh giá thành công' });
        loadData();
      }
    } catch (err) {
      setAlert({ type: 'error', msg: 'Không thể xóa đợt đánh giá' });
    }
  };

  // Tính toán thống kê
  const totalEvaluations = evaluations.length;
  let totalFeedbacks = 0;
  let totalRatingSum = 0;

  evaluations.forEach((item) => {
    (item.responses || []).forEach((r) => {
      totalFeedbacks++;
      totalRatingSum += (r.rating !== undefined ? r.rating : (r.overallRating || 5));
    });
  });

  const averageRating = totalFeedbacks > 0 ? (totalRatingSum / totalFeedbacks).toFixed(1) : '5.0';

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Alert message */}
      {alert && (
        <div
          className={`alert ${alert.type === 'error' ? 'alert-danger' : 'alert-success'}`}
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{alert.msg}</span>
          <button onClick={() => setAlert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '18px 20px', borderRadius: '14px', background: 'var(--bg-card, #fff)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <i className="fa-solid fa-clipboard-list" style={{ color: '#6366f1', marginRight: '6px' }}></i> Tổng Đợt Đánh Giá
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#4f46e5' }}>{totalEvaluations}</div>
        </div>

        <div className="stat-card" style={{ padding: '18px 20px', borderRadius: '14px', background: 'var(--bg-card, #fff)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <i className="fa-solid fa-comments" style={{ color: '#10b981', marginRight: '6px' }}></i> Phản Hồi Từ Sinh Viên
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>{totalFeedbacks}</div>
        </div>

        <div className="stat-card" style={{ padding: '18px 20px', borderRadius: '14px', background: 'var(--bg-card, #fff)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <i className="fa-solid fa-star" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Điểm Đánh Giá TB
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706' }}>
            {averageRating} <span style={{ fontSize: '16px', color: '#f59e0b' }}>⭐ / 5.0</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form tạo mới + Danh sách */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Form Tạo Đợt Đánh Giá */}
        <div
          className="card"
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
            background: 'var(--bg-card, #ffffff)'
          }}
        >
          <div
            className="card-header"
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.04), rgba(124, 58, 237, 0.04))'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700, color: '#3730a3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i>
                Tạo Đợt Đánh Giá Giảng Viên Mới
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Admin thiết lập thông tin môn học, mã sinh viên, giảng viên và tiêu chí đánh giá từ 0 đến 5 sao
              </p>
            </div>
          </div>

          <div className="card-body" style={{ padding: '24px' }}>
            <form onSubmit={handleCreateEvaluation}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                {/* 1. THÔNG TIN MÔN HỌC */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                    <i className="fa-solid fa-book-bookmark" style={{ color: '#4f46e5', marginRight: '6px' }}></i>
                    1. Thông tin môn học:
                  </label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${courseType === 'select' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCourseType('select')}
                      style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px' }}
                    >
                      Chọn môn có sẵn
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${courseType === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCourseType('manual')}
                      style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px' }}
                    >
                      Nhập môn tùy chỉnh
                    </button>
                  </div>

                  {courseType === 'select' ? (
                    <select
                      className="form-control"
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px' }}
                    >
                      {courses.length === 0 ? (
                        <option value="">(Chưa có môn học trong danh mục)</option>
                      ) : (
                        courses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.code ? `[${c.code}] ` : ''}
                            {c.name} ({c.credits || 3} TC)
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Mã môn"
                        value={manualCourseCode}
                        onChange={(e) => setManualCourseCode(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: '8px' }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tên môn học (bắt buộc)"
                        value={manualCourseName}
                        onChange={(e) => setManualCourseName(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: '8px' }}
                        required
                      />
                    </div>
                  )}
                </div>

                {/* 2. MÃ SỐ & TÊN SINH VIÊN */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                    <i className="fa-solid fa-user-graduate" style={{ color: '#059669', marginRight: '6px' }}></i>
                    2. Thông tin sinh viên (Mã SV & Tên sinh viên):
                  </label>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${studentTargetType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setStudentTargetType('ALL')}
                      style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '6px' }}
                    >
                      Tất cả SV (ALL)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${studentTargetType === 'select' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setStudentTargetType('select')}
                      style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '6px' }}
                    >
                      Chọn từ danh sách SV
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${studentTargetType === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setStudentTargetType('manual')}
                      style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '6px' }}
                    >
                      Nhập tay Mã & Tên
                    </button>
                  </div>

                  {studentTargetType === 'ALL' && (
                    <div style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', color: '#065f46', fontSize: '13px', fontWeight: 500 }}>
                      <i className="fa-solid fa-check-circle" style={{ marginRight: '6px' }}></i>
                      Áp dụng cho toàn bộ sinh viên trên cổng đào tạo
                    </div>
                  )}

                  {studentTargetType === 'select' && (
                    <select
                      className="form-control"
                      value={targetStudentId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        setTargetStudentId(sid);
                        const sObj = students.find((st) => st._id === sid);
                        if (sObj) {
                          setTargetStudentCode(sObj.code || '');
                          setTargetStudentName(sObj.name || '');
                        } else {
                          setTargetStudentCode('');
                          setTargetStudentName('');
                        }
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px' }}
                      required
                    >
                      <option value="">-- Chọn sinh viên cần đánh giá --</option>
                      {students.map((st) => (
                        <option key={st._id} value={st._id}>
                          [{st.code || 'MSSV'}] {st.name} {st.classCode ? ` - Lớp: ${st.classCode}` : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  {studentTargetType === 'manual' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Mã SV (VD: SV001)"
                        value={targetStudentCode}
                        onChange={(e) => setTargetStudentCode(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: '8px' }}
                        required
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Họ và tên sinh viên"
                        value={targetStudentName}
                        onChange={(e) => setTargetStudentName(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: '8px' }}
                        required
                      />
                    </div>
                  )}
                </div>

                {/* 3. THANH LỰA CHỌN GIẢNG VIÊN */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                    <i className="fa-solid fa-chalkboard-user" style={{ color: '#d97706', marginRight: '6px' }}></i>
                    3. Thanh lựa chọn giảng viên:
                  </label>
                  <select
                    className="form-control"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px' }}
                    required
                  >
                    {teachers.length === 0 ? (
                      <option value="">(Đang tải danh sách giảng viên...)</option>
                    ) : (
                      teachers.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} {t.code ? `(${t.code})` : ''} - {t.email}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* 4. KHUNG NHẬP ĐÁNH GIÁ (NỘI DUNG / TIÊU CHÍ) */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                  <i className="fa-solid fa-pen-to-square" style={{ color: '#4f46e5', marginRight: '6px' }}></i>
                  4. Khung nhập nội dung & tiêu chí đánh giá:
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={evaluationPrompt}
                  onChange={(e) => setEvaluationPrompt(e.target.value)}
                  placeholder="Nhập hướng dẫn hoặc tiêu chí đánh giá để sinh viên theo dõi khi làm phiếu..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '13.5px' }}
                  required
                />
              </div>

              {/* 5. SỐ SAO TỪ 0 ĐẾN 5 (THANG ĐIỂM ĐÁNH GIÁ) */}
              <div style={{ marginBottom: '22px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.06)', border: '1px dashed rgba(245, 158, 11, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#92400e' }}>
                      <i className="fa-solid fa-star" style={{ color: '#f59e0b', marginRight: '6px' }}></i>
                      5. Thang điểm đánh giá: Từ 0 đến 5 sao
                    </span>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#b45309' }}>
                      Sinh viên trên giao diện sẽ được tự do bấm chọn số sao tương ứng và nhập ý kiến nhận xét
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {[0, 1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: star === 0 ? '#f3f4f6' : '#fffbeb',
                          border: star === 0 ? '1px solid #d1d5db' : '1px solid #fcd34d',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: star === 0 ? '#4b5563' : '#b45309'
                        }}
                      >
                        {star} <i className={`fa-solid fa-star`} style={{ color: star === 0 ? '#9ca3af' : '#f59e0b', fontSize: '11px' }}></i>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)'
                  }}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi lên hệ thống...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i> Gửi Lên Hệ Thống Cho Sinh Viên
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Danh Sách Đợt Đánh Giá Đã Tạo */}
        <div
          className="card"
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
            background: 'var(--bg-card, #ffffff)'
          }}
        >
          <div
            className="card-header"
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                <i className="fa-solid fa-list-check" style={{ color: '#4f46e5', marginRight: '8px' }}></i>
                Danh Sách Phiếu Đánh Giá Giảng Viên ({evaluations.length})
              </h3>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>
              <i className="fa-solid fa-rotate"></i> Làm mới
            </button>
          </div>

          <div className="card-body" style={{ padding: '0' }}>
            {evaluations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-regular fa-folder-open" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', opacity: 0.5 }}></i>
                Chưa có đợt đánh giá giảng viên nào. Vui lòng tạo đợt đánh giá ở biểu mẫu phía trên.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(79, 70, 229, 0.04)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                      <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)' }}>MÔN HỌC</th>
                      <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)' }}>GIẢNG VIÊN</th>
                      <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)' }}>ĐỐI TƯỢNG SV</th>
                      <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)' }}>PHẢN HỒI</th>
                      <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)' }}>ĐIỂM SAO TB</th>
                      <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)' }}>TRẠNG THÁI</th>
                      <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluations.map((item) => {
                      const resCount = item.responses?.length || 0;
                      let avg = 0;
                      if (resCount > 0) {
                        const sum = item.responses.reduce((acc, cur) => acc + (cur.rating !== undefined ? cur.rating : (cur.overallRating || 5)), 0);
                        avg = (sum / resCount).toFixed(1);
                      }

                      return (
                        <tr key={item._id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#312e81' }}>{item.courseName}</div>
                            {item.courseCode && (
                              <span style={{ fontSize: '11.5px', color: '#6366f1', fontFamily: 'monospace', fontWeight: 700 }}>
                                {item.courseCode}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#1f2937' }}>
                              👨‍🏫 {item.teacherName || item.teacher?.name || 'Giảng viên'}
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {item.teacher?.code || item.teacher?.email}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {item.targetStudentCode === 'ALL' ? (
                              <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: 600 }}>
                                🌐 Toàn bộ sinh viên
                              </span>
                            ) : (
                              <div>
                                <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  🎯 {item.targetStudentCode}
                                </span>
                                {item.targetStudentName && (
                                  <div style={{ fontSize: '12px', color: '#374151', fontWeight: 600, marginTop: '4px' }}>
                                    👤 {item.targetStudentName}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                setViewingEval(item);
                                setDetailModalOpen(true);
                              }}
                              style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px' }}
                            >
                              <i className="fa-solid fa-comments"></i> {resCount} phản hồi
                            </button>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {resCount > 0 ? (
                              <span style={{ fontWeight: 800, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                ⭐ {avg} / 5
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chưa có</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: item.isOpen ? '#ecfdf5' : '#fef2f2',
                                color: item.isOpen ? '#059669' : '#dc2626'
                              }}
                            >
                              {item.isOpen ? 'Đang mở' : 'Đã đóng'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                className="btn btn-sm btn-secondary"
                                title={item.isOpen ? 'Đóng khảo sát' : 'Mở lại'}
                                onClick={() => handleToggleStatus(item._id)}
                                style={{ padding: '4px 8px', borderRadius: '6px' }}
                              >
                                <i className={`fa-solid ${item.isOpen ? 'fa-lock' : 'fa-lock-open'}`}></i>
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                title="Xóa đợt đánh giá"
                                onClick={() => handleDeleteEvaluation(item._id)}
                                style={{ padding: '4px 8px', borderRadius: '6px', color: '#dc2626' }}
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT CÁC ĐÁNH GIÁ CỦA SINH VIÊN GỬI VỀ */}
      {detailModalOpen && viewingEval && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setDetailModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              background: '#fff',
              borderRadius: '18px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                  Phản Hồi Đánh Giá Giảng Viên: {viewingEval.teacherName || viewingEval.teacher?.name}
                </h3>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Môn: {viewingEval.courseName} • Thang điểm: 0 - 5 sao
                </span>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {(!viewingEval.responses || viewingEval.responses.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                  Chưa có sinh viên nào gửi đánh giá cho đợt này.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {viewingEval.responses.map((resp, idx) => {
                    const rScore = resp.rating !== undefined ? resp.rating : (resp.overallRating || 5);
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          background: '#fcfcfd'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b' }}>
                              🎓 {resp.studentName || 'Sinh viên'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>
                              MSSV: {resp.studentCode || 'Ẩn danh'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: '#d97706' }}>
                              {rScore} / 5
                            </span>
                            <span style={{ color: '#f59e0b' }}>
                              {Array.from({ length: 5 }, (_, i) => (
                                <i
                                  key={i}
                                  className={`fa-solid fa-star`}
                                  style={{ color: i < rScore ? '#f59e0b' : '#d1d5db', fontSize: '12px' }}
                                />
                              ))}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: '13px', color: '#334155', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          {resp.feedback ? (
                            <span>💬 {resp.feedback}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có nhận xét viết tay</span>
                          )}
                        </div>

                        {resp.submittedAt && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', textAlign: 'right' }}>
                            ⏱ Gửi lúc: {new Date(resp.submittedAt).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button className="btn btn-secondary" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
