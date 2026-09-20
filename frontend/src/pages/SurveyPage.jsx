import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import SurveyModal from '../components/SurveyModal';

export default function SurveyPage({ currentUser }) {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const res = await api.getSurveys();
      if (res.success && res.data) {
        setSurveys(res.data);
      }
    } catch (err) {
      console.error('Error loading surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSurvey = (survey) => {
    setSelectedSurvey(survey);
    setModalOpen(true);
  };

  return (
    <div className="glass-panel">
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i>
            Đánh Giá Giảng Viên Giảng Dạy
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Danh sách các phiếu đánh giá do Nhà Trường / Ban Quản Trị phát động dành cho sinh viên
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadSurveys}>
          <i className="fa-solid fa-rotate"></i> Làm mới
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginTop: '16px' }}>
        {surveys.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13.5px', gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>
            <i className="fa-regular fa-clipboard" style={{ fontSize: '36px', display: 'block', marginBottom: '12px', opacity: 0.5 }}></i>
            {loading ? 'Đang tải danh sách đánh giá giảng viên...' : 'Hiện tại chưa có đợt đánh giá giảng viên nào cần bạn thực hiện.'}
          </div>
        ) : (
          surveys.map((s) => {
            const hasSubmitted = !!s.hasSubmitted;
            const myRating = s.mySubmission?.rating !== undefined ? s.mySubmission.rating : null;

            return (
              <div
                key={s._id}
                className="stat-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                  padding: '20px',
                  border: hasSubmitted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)',
                  background: 'var(--bg-card, #ffffff)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-purple" style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {s.courseCode || s.course?.code || 'HP-CHUYEN-NGANH'}
                    </span>
                    {hasSubmitted ? (
                      <span className="badge badge-success" style={{ fontWeight: 700 }}>
                        ✓ Đã đánh giá ({myRating}/5 ⭐)
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                        Chưa đánh giá
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.4 }}>
                    {s.courseName || s.title}
                  </h3>

                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-chalkboard-user" style={{ color: '#6366f1' }}></i>
                    Giảng viên: <strong style={{ color: 'var(--text-main)' }}>{s.teacherName || s.teacher?.name || 'Giảng viên'}</strong>
                  </div>

                  {s.targetStudentCode && s.targetStudentCode !== 'ALL' && (
                    <div style={{ fontSize: '12px', color: '#0284c7', marginBottom: '10px', background: 'rgba(2, 132, 199, 0.08)', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-user-graduate"></i>
                      <span>
                        Sinh viên chỉ định: <strong>{s.targetStudentName ? `${s.targetStudentName} (${s.targetStudentCode})` : s.targetStudentCode}</strong>
                      </span>
                    </div>
                  )}

                  {s.evaluationPrompt && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        background: 'rgba(0, 0, 0, 0.03)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        marginBottom: '14px',
                        lineHeight: 1.45,
                        fontStyle: 'italic'
                      }}
                    >
                      "{s.evaluationPrompt}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 700 }}>
                    Thang điểm: 0 - 5 ⭐
                  </span>

                  <button
                    className={`btn ${hasSubmitted ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    onClick={() => handleOpenSurvey(s)}
                    disabled={!s.isOpen}
                    style={{
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fa-solid fa-star"></i>
                    {hasSubmitted ? 'Sửa Đánh Giá' : 'Đánh Giá Ngay'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SurveyModal
        isOpen={modalOpen}
        survey={selectedSurvey}
        currentUser={currentUser}
        onClose={() => setModalOpen(false)}
        onSuccess={loadSurveys}
      />
    </div>
  );
}
