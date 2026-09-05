import React, { useState } from 'react';
import { api } from '../services/api';

export default function SurveyModal({ isOpen, onClose, survey, onSuccess }) {
  const [teachingMethodRating, setTeachingMethod] = useState('5');
  const [knowledgeRating, setKnowledge] = useState('5');
  const [punctualityRating, setPunctuality] = useState('5');
  const [fairnessRating, setFairness] = useState('5');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !survey) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await api.submitSurveyResponse(survey._id, {
      teachingMethodRating,
      knowledgeRating,
      punctualityRating,
      fairnessRating,
      feedback,
      isAnonymous: true
    });

    setLoading(false);

    if (res.success) {
      alert('✅ Đã gửi ý kiến đánh giá ẩn danh thành công!');
      onSuccess();
      onClose();
    } else {
      alert(`❌ Lỗi: ${res.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-star"></i> Đánh Giá Môn Học (Bảo Mật Ẩn Danh)
          </h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <h4 style={{ color: '#60a5fa', fontSize: '14px', marginBottom: '16px' }}>{survey.title}</h4>

            <div className="form-group">
              <label>1. Phương pháp giảng dạy và truyền đạt kiến thức:</label>
              <select
                className="form-control"
                value={teachingMethodRating}
                onChange={(e) => setTeachingMethod(e.target.value)}
              >
                <option value="5">⭐⭐⭐⭐⭐ (5/5 - Rất tốt, dễ hiểu)</option>
                <option value="4">⭐⭐⭐⭐ (4/5 - Tốt)</option>
                <option value="3">⭐⭐⭐ (3/5 - Trung bình)</option>
              </select>
            </div>

            <div className="form-group">
              <label>2. Kiến thức chuyên môn và tài liệu học tập:</label>
              <select
                className="form-control"
                value={knowledgeRating}
                onChange={(e) => setKnowledge(e.target.value)}
              >
                <option value="5">⭐⭐⭐⭐⭐ (5/5 - Sâu rộng, thực tế)</option>
                <option value="4">⭐⭐⭐⭐ (4/5 - Đạt yêu cầu)</option>
              </select>
            </div>

            <div className="form-group">
              <label>3. Tác phong lên lớp và sự hỗ trợ sinh viên:</label>
              <select
                className="form-control"
                value={punctualityRating}
                onChange={(e) => setPunctuality(e.target.value)}
              >
                <option value="5">⭐⭐⭐⭐⭐ (5/5 - Đúng giờ, nhiệt tình)</option>
                <option value="4">⭐⭐⭐⭐ (4/5 - Tốt)</option>
              </select>
            </div>

            <div className="form-group">
              <label>4. Tính công bằng trong kiểm tra và đánh giá điểm:</label>
              <select
                className="form-control"
                value={fairnessRating}
                onChange={(e) => setFairness(e.target.value)}
              >
                <option value="5">⭐⭐⭐⭐⭐ (5/5 - Minh bạch, công bằng)</option>
                <option value="4">⭐⭐⭐⭐ (4/5 - Tốt)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Ý kiến đóng góp xây dựng môn học:</label>
              <textarea
                className="form-control"
                placeholder="Góp ý xây dựng..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              ></textarea>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fa-solid fa-paper-plane"></i> Gửi Đánh Giá Ẩn Danh
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
