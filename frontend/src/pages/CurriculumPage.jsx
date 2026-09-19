import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function CurriculumPage({ currentUser }) {
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurriculums = async () => {
      setLoading(true);
      try {
        const res = await api.getCurriculumView();
        if (res.success) {
          setCurriculums(res.data || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải CTĐT:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurriculums();
  }, []);

  return (
    <div className="tab-pane active" style={{ animation: 'fadeUp 0.3s ease-out' }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px', padding: '24px',
        background: '#ffffff', borderRadius: '18px',
        border: '1px solid rgba(226,232,240,0.9)',
        boxShadow: '0 4px 20px rgba(15,23,42,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', color: '#fff', boxShadow: '0 8px 20px rgba(59,130,246,0.25)'
          }}>
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a', letterSpacing: '-0.3px' }}>
              Chương Trình Đào Tạo Định Hướng
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Theo dõi lộ trình học tập và số tín chỉ từng môn học được Phòng Đào Tạo mở hiển thị theo từng học kỳ.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '26px', color: '#2563eb', marginBottom: '12px', display: 'block' }}></i>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Đang tải chương trình học...</span>
        </div>
      ) : curriculums.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '56px', background: '#ffffff',
          borderRadius: '18px', border: '1px solid rgba(226,232,240,0.9)',
          boxShadow: '0 4px 20px rgba(15,23,42,0.04)'
        }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '26px', color: '#94a3b8' }}></i>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>Chưa có học kỳ nào trong chương trình đào tạo</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Hệ thống sẽ cập nhật ngay khi Phòng Đào Tạo mở học kỳ mới.</div>
        </div>
      ) : (
        curriculums.map(curr => (
          <div key={curr._id} style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: '#1e40af' }}>
                  {curr.name} — Khóa {curr.academicYear}
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Ngành: <strong style={{ color: '#0f172a' }}>{curr.major?.name || 'Công nghệ thông tin'}</strong>
                </span>
              </div>
              <span style={{
                padding: '6px 14px', borderRadius: '20px',
                background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                fontSize: '12.5px', fontWeight: 800
              }}>
                {curr.semesters?.length || 0} Học kỳ đang hiển thị
              </span>
            </div>

            {curr.semesters?.length === 0 ? (
              <div style={{ padding: '20px', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                Chưa có học kỳ nào được mở hiển thị.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {curr.semesters.map(sem => {
                  const totalSemCredits = sem.courses?.reduce((sum, c) => sum + (c.credits || 0), 0) || 0;

                  return (
                    <div
                      key={sem.semesterIndex}
                      style={{
                        background: '#ffffff',
                        border: '1px solid rgba(226,232,240,0.9)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 16px rgba(15,23,42,0.03)'
                      }}
                    >
                      <div style={{
                        padding: '16px 20px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            width: '26px', height: '26px', borderRadius: '8px',
                            background: '#2563eb', color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800
                          }}>
                            {sem.semesterIndex}
                          </span>
                          <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>
                            {sem.semesterName || `Học kỳ ${sem.semesterIndex}`}
                          </strong>
                        </div>
                        <span style={{
                          fontSize: '12.5px', fontWeight: 800,
                          color: '#15803d', background: '#dcfce7',
                          padding: '4px 12px', borderRadius: '12px', border: '1px solid #bbf7d0'
                        }}>
                          Tổng: {totalSemCredits} Tín chỉ
                        </span>
                      </div>

                      <div style={{ padding: '20px' }}>
                        {sem.courses?.length === 0 ? (
                          <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Chưa có danh sách môn học cho học kỳ này.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                            {sem.courses.map(course => (
                              <div
                                key={course._id}
                                style={{
                                  padding: '14px 16px',
                                  borderRadius: '12px',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  justify: 'space-between',
                                  alignItems: 'center',
                                  transition: 'all 0.15s ease-in-out'
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                                    {course.name}
                                  </div>
                                  <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                                    {course.code}
                                  </span>
                                </div>
                                <span style={{
                                  padding: '4px 10px', borderRadius: '10px',
                                  background: '#e0e7ff', color: '#3730a3',
                                  fontWeight: 800, fontSize: '12px', flexShrink: 0
                                }}>
                                  {course.credits || 3} Tín chỉ
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
