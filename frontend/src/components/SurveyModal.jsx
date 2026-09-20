import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const STAR_LABELS = {
  0: '0/5 ⭐ - Hoàn toàn không hài lòng / Rất kém',
  1: '1/5 ⭐ - Không hài lòng / Kém',
  2: '2/5 ⭐ - Tạm chấp nhận / Dưới trung bình',
  3: '3/5 ⭐ - Trung bình / Đạt yêu cầu',
  4: '4/5 ⭐ - Hài lòng / Giảng dạy tốt',
  5: '5/5 ⭐ - Rất hài lòng / Xuất sắc, nhiệt tình'
};

export default function SurveyModal({ isOpen, onClose, survey, currentUser, onSuccess }) {
  // Lấy thông tin user đăng nhập với dự phòng
  const fallbackUser = React.useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const effectiveUser = currentUser || fallbackUser || {};

  const [studentCode, setStudentCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (survey) {
      if (survey.mySubmission) {
        setRating(survey.mySubmission.rating !== undefined ? survey.mySubmission.rating : 5);
        setFeedback(survey.mySubmission.feedback || '');
        setStudentCode(
          survey.mySubmission.studentCode ||
          (survey.targetStudentCode && survey.targetStudentCode !== 'ALL' ? survey.targetStudentCode : '') ||
          effectiveUser.code ||
          ''
        );
        setStudentName(
          survey.mySubmission.studentName ||
          survey.targetStudentName ||
          effectiveUser.name ||
          ''
        );
      } else {
        setRating(5);
        setFeedback('');
        setStudentCode(
          (survey.targetStudentCode && survey.targetStudentCode !== 'ALL' ? survey.targetStudentCode : '') ||
          effectiveUser.code ||
          ''
        );
        setStudentName(survey.targetStudentName || effectiveUser.name || '');
      }
      setHoverRating(null);
    }
  }, [survey, isOpen, effectiveUser.code, effectiveUser.name]);

  if (!isOpen || !survey) return null;

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const cleanCode = (studentCode || effectiveUser.code || '').trim();
    const cleanName = (studentName || effectiveUser.name || '').trim();

    if (!cleanCode || !cleanName) {
      alert('⚠️ Vui lòng nhập đầy đủ Mã số sinh viên và Họ tên sinh viên.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        rating: Number(rating),
        feedback: feedback.trim(),
        studentCode: cleanCode,
        studentName: cleanName,
        // Cung cấp các trường dự phòng cho hệ thống
        overallRating: Number(rating),
        teachingMethodRating: Number(rating),
        knowledgeRating: Number(rating),
        punctualityRating: Number(rating),
        fairnessRating: Number(rating)
      };

      const res = await api.submitSurveyResponse(survey._id, payload);

      setLoading(false);

      if (res.success) {
        alert('🎉 Đã gửi đánh giá giảng viên thành công!\nThông tin đánh giá đã được chuyển trực tiếp về Hộp thư Quản trị viên.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert(`❌ Lỗi: ${res.message || 'Không thể gửi đánh giá'}`);
      }
    } catch (err) {
      setLoading(false);
      alert(`❌ Lỗi kết nối: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-content" style={{ maxWidth: '600px', borderRadius: '18px', overflow: 'hidden' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))', padding: '18px 24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i>
              Đánh Giá Giảng Viên Giảng Dạy
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Phiếu phản hồi chất lượng đào tạo gửi trực tiếp tới Ban Quản Trị
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '24px' }}>
            {/* THÔNG TIN HỌC PHẦN & GIẢNG VIÊN */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Môn học
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                    {survey.courseName || survey.title}
                  </div>
                  {survey.courseCode && (
                    <span style={{ fontSize: '11.5px', color: '#6366f1', fontFamily: 'monospace', fontWeight: 700 }}>
                      Mã môn: {survey.courseCode}
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Giảng viên phụ trách
                  </div>
                  <div style={{ fontWeight: 700, color: '#d97706', fontSize: '14px' }}>
                    👨‍🏫 {survey.teacherName || survey.teacher?.name || 'Giảng viên'}
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {survey.teacher?.email || ''}
                  </span>
                </div>
              </div>
            </div>

            {/* MỤC 1: THÔNG TIN SINH VIÊN ĐÁNH GIÁ (MÃ SINH VIÊN & TÊN SINH VIÊN) */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-id-card" style={{ color: '#10b981' }}></i>
                  Thông tin sinh viên đánh giá:
                </label>
                {survey.mySubmission && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', fontWeight: 600 }}>
                    ✓ Đã từng gửi đánh giá
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Mã số sinh viên (MSSV) <span style={{ color: '#ef4444' }}>*</span>:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="Nhập MSSV (VD: SV001)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Họ và tên sinh viên <span style={{ color: '#ef4444' }}>*</span>:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Nhập họ và tên sinh viên"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* HƯỚNG DẪN / GHI CHÚ TỪ ADMIN */}
            {survey.evaluationPrompt && (
              <div style={{ marginBottom: '18px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '12.5px', color: '#92400e' }}>
                <strong><i className="fa-solid fa-circle-info" style={{ marginRight: '6px' }}></i>Ghi chú từ Nhà Trường:</strong> {survey.evaluationPrompt}
              </div>
            )}

            {/* BỘ CHỌN SỐ SAO TỪ 0 ĐẾN 5 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '8px', color: 'var(--text-main)' }}>
                ⭐ Chọn số sao đánh giá (Từ 0 đến 5 sao):
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--bg-card, #ffffff)',
                  border: '1.5px solid rgba(245, 158, 11, 0.3)',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Nút 0 sao */}
                  <button
                    type="button"
                    onClick={() => setRating(0)}
                    onMouseEnter={() => setHoverRating(0)}
                    onMouseLeave={() => setHoverRating(null)}
                    style={{
                      border: rating === 0 ? '2px solid #ef4444' : '1px solid #d1d5db',
                      background: rating === 0 ? '#fee2e2' : '#f9fafb',
                      color: rating === 0 ? '#b91c1c' : '#6b7280',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="0 sao - Rất kém"
                  >
                    0 ⭐
                  </button>

                  {/* 1 đến 5 sao */}
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '32px',
                        color: star <= currentDisplayRating ? '#f59e0b' : '#d1d5db',
                        transform: (star <= currentDisplayRating) ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease, color 0.15s ease'
                      }}
                      title={`${star} sao`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 600, color: rating === 0 ? '#dc2626' : '#d97706' }}>
                  {STAR_LABELS[currentDisplayRating]}
                </div>
              </div>
            </div>

            {/* KHUNG NHẬP ĐÁNH GIÁ CHI TIẾT */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '8px', color: 'var(--text-main)' }}>
                ✍️ Khung nhập nội dung đánh giá / Nhận xét chi tiết:
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Nhập cảm nhận của bạn về cách truyền đạt bài giảng, thái độ nhiệt tình hỗ trợ, giải đáp thắc mắc của giảng viên..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 0, 0, 0.15)',
                  fontSize: '13.5px',
                  resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                * Đánh giá này kèm Mã SV và Tên của bạn sẽ được gửi trực tiếp về Hộp thư thông báo của Ban Quản Trị.
              </span>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(0, 0, 0, 0.06)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)'
              }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i> Gửi Đánh Giá Về Admin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
