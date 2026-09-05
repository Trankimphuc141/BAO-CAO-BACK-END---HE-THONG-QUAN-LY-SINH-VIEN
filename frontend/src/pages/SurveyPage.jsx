import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import SurveyModal from '../components/SurveyModal';

export default function SurveyPage() {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    const res = await api.getSurveys();
    if (res.success && res.data) {
      setSurveys(res.data);
    }
    setLoading(false);
  };

  const handleOpenSurvey = (survey) => {
    setSelectedSurvey(survey);
    setModalOpen(true);
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h3>
          <i className="fa-solid fa-star-half-stroke"></i> Phiếu Khảo Sát Đánh Giá Chất Lượng Giảng Dạy (Bảo Mật Ẩn Danh)
        </h3>
        <button className="btn btn-secondary btn-sm" onClick={loadSurveys}>
          <i className="fa-solid fa-rotate"></i> Làm mới
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {surveys.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', gridColumn: '1/-1', textAlign: 'center', padding: '20px 0' }}>
            {loading ? 'Đang tải danh sách khảo sát...' : 'Không có phiếu khảo sát nào đang mở'}
          </div>
        ) : (
          surveys.map((s) => (
            <div key={s._id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge badge-purple">{s.course?.code}</span>
                  <span className={`badge ${s.isOpen ? 'badge-success' : 'badge-danger'}`}>
                    {s.isOpen ? 'Đang mở' : 'Đã đóng'}
                  </span>
                </div>
                <h3 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '8px' }}>{s.title}</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  <i className="fa-solid fa-chalkboard-user"></i> Giảng viên: <strong>{s.teacher?.name}</strong>
                </p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenSurvey(s)}
                disabled={!s.isOpen}
              >
                <i className="fa-solid fa-star"></i> Làm Đánh Giá Môn Học (Ẩn danh)
              </button>
            </div>
          ))
        )}
      </div>

      <SurveyModal
        isOpen={modalOpen}
        survey={selectedSurvey}
        onClose={() => setModalOpen(false)}
        onSuccess={loadSurveys}
      />
    </div>
  );
}
