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
      <div className="section-card" style={{ marginBottom: '24px', padding: '24px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', color: '#fff', boxShadow: '0 8px 20px rgba(59,130,246,0.3)'
          }}>
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#fff' }}>
              Chương Trình Đào Tạo Định Hướng
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              Theo dõi lộ trình học tập và số tín chỉ từng môn học được Phòng Đào Tạo mở hiển thị theo từng học kỳ.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.6)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
          Đang tải chương trình học...
        </div>
      ) : curriculums.length === 0 ? (
        <div className="section-card" style={{ textAlign: 'center', padding: '50px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '36px', opacity: 0.3, marginBottom: '12px', display: 'block' }}></i>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            Hiện tại chưa có học kỳ nào được mở hiển thị trong chương trình đào tạo của bạn.
          </p>
        </div>
      ) : (
        curriculums.map(curr => (
          <div key={curr._id} style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0', color: '#93c5fd' }}>
                  {curr.name} — Khóa {curr.academicYear}
                </h3>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  Ngành: <strong style={{ color: '#fff' }}>{curr.major?.name || 'Công nghệ thông tin'}</strong>
                </span>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: '20px',
                background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
                fontSize: '12px', fontWeight: 700
              }}>
                {curr.semesters?.length || 0} Học kỳ đang hiển thị
              </span>
            </div>

            {curr.semesters?.length === 0 ? (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
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
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '14px',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        padding: '14px 20px',
                        background: 'rgba(255,255,255,0.05)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            width: '24px', height: '24px', borderRadius: '6px',
                            background: '#3b82f6', color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800
                          }}>
                            {sem.semesterIndex}
                          </span>
                          <strong style={{ fontSize: '15px', color: '#fff' }}>
                            {sem.semesterName || `Học kỳ ${sem.semesterIndex}`}
                          </strong>
                        </div>
                        <span style={{
                          fontSize: '12.5px', fontWeight: 700,
                          color: '#34d399', background: 'rgba(16,185,129,0.15)',
                          padding: '3px 10px', borderRadius: '12px'
                        }}>
                          Tổng: {totalSemCredits} Tín chỉ
                        </span>
                      </div>

                      <div style={{ padding: '16px 20px' }}>
                        {sem.courses?.length === 0 ? (
                          <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                            Chưa có danh sách môn học cho học kỳ này.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                            {sem.courses.map(course => (
                              <div
                                key={course._id}
                                style={{
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
                                    {course.name}
                                  </div>
                                  <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                                    {course.code}
                                  </span>
                                </div>
                                <span style={{
                                  padding: '3px 10px', borderRadius: '12px',
                                  background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
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
