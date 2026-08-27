import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';

export default function ProfilePage({ currentUser, onAvatarUpdated }) {
  const [profile, setProfile] = useState(null);
  const [grades, setGrades] = useState([]);
  const [summary, setSummary] = useState({ gpa4: '0.0', gpa10: '0.0', standing: '-' });
  const [announcements, setAnnouncements] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('Tất cả học kỳ');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfileData();
  }, [currentUser]);

  const loadProfileData = async () => {
    if (!currentUser) return;
    const res = await api.getStudentPortalInfo(currentUser.id);
    if (res.success) {
      setProfile(res.student);
      setGrades(res.grades || []);
      if (res.academicSummary) {
        setSummary({
          gpa4: res.academicSummary.gpa4,
          gpa10: res.academicSummary.gpa10,
          standing: res.academicSummary.academicStanding
        });
      }
    }

    const annRes = await api.getAnnouncements();
    if (annRes.success && annRes.data) {
      setAnnouncements(annRes.data);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Kích thước ảnh quá lớn! Vui lòng chọn ảnh dung lượng dưới 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      const res = await api.updateAvatar(base64Data, currentUser.id);
      if (res.success) {
        alert('📸 Cập nhật ảnh đại diện thành công!');
        setProfile((prev) => ({ ...prev, avatar: res.avatar || base64Data }));
        if (onAvatarUpdated) onAvatarUpdated(res.avatar || base64Data);
      } else {
        alert(`❌ Lỗi cập nhật ảnh: ${res.message}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const student = profile || currentUser;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
      <div className="glass-panel">
        <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="avatar-upload-wrapper" style={{ marginBottom: '10px' }}>
            <img
              src={
                student?.avatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
              }
              alt="Avatar"
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                border: '3px solid var(--primary)',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            <button
              className="avatar-edit-badge"
              onClick={() => fileInputRef.current?.click()}
              title="Tải ảnh từ máy tính"
            >
              <i className="fa-solid fa-camera"></i>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />

          <div style={{ marginBottom: '12px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '11px', padding: '3px 10px' }}
            >
              <i className="fa-solid fa-upload"></i> Tải ảnh từ máy tính
            </button>
          </div>

          <h3 style={{ fontSize: '16px', color: '#fff' }}>{student?.name || '-'}</h3>
          <p style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>Mã SV: {student?.code || '-'}</p>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Khoa:</strong> {student?.department || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Ngành:</strong> {student?.major || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Lớp SH:</strong> {student?.classCode || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Email:</strong> {student?.email || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Khóa học:</strong> {student?.academicYear || '-'}
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '14px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Điểm GPA (Hệ 4):</span>
            <strong style={{ color: '#60a5fa', fontSize: '15px' }}>{summary.gpa4}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Điểm CPA (Hệ 10):</span>
            <strong style={{ color: '#34d399', fontSize: '15px' }}>{summary.gpa10}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Xếp loại:</span>
            <span className="badge badge-success">{summary.standing}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="glass-panel">
          {(() => {
            const publishedGrades = grades.filter(g => g.isPublished);
            const semesters = ['Tất cả học kỳ', ...new Set(publishedGrades.map(g => g.semester).filter(Boolean))];
            const filteredGrades = selectedSemester === 'Tất cả học kỳ' 
              ? publishedGrades 
              : publishedGrades.filter(g => g.semester === selectedSemester);

            const totalCredits = filteredGrades.reduce((sum, g) => sum + (g.course?.credits || 3), 0);
            const sumScore4 = filteredGrades.reduce((sum, g) => sum + (g.totalScore4 || 0) * (g.course?.credits || 3), 0);
            const sumScore10 = filteredGrades.reduce((sum, g) => sum + (g.totalScore10 || 0) * (g.course?.credits || 3), 0);
            
            const gpa4 = totalCredits > 0 ? (sumScore4 / totalCredits).toFixed(2) : '0.00';
            const gpa10 = totalCredits > 0 ? (sumScore10 / totalCredits).toFixed(2) : '0.00';

            return (
              <>
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3>
                    <i className="fa-solid fa-receipt"></i> Bảng Điểm Chi Tiết Các Học Phần
                  </h3>
                  
                  {/* Semester Dropdown */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Học kỳ:</span>
                    <select 
                      className="form-control" 
                      style={{ padding: '4px 8px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', width: '150px' }}
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                    >
                      {semesters.map(sem => (
                        <option key={sem} value={sem} style={{ background: '#1e293b', color: '#fff' }}>{sem}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Semester Summary */}
                <div style={{ display: 'flex', gap: '15px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-light)' }}>
                  <div>GPA Học Kỳ (Hệ 4): <strong style={{ color: '#60a5fa' }}>{gpa4}</strong></div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>GPA Học Kỳ (Hệ 10): <strong style={{ color: '#34d399' }}>{gpa10}</strong></div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>Số TC Đăng Ký: <strong>{totalCredits}</strong></div>
                </div>

                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Mã HP</th>
                        <th>Tên Môn Học</th>
                        <th>Số TC</th>
                        <th>Chuyên cần (10%)</th>
                        <th>Giữa kỳ (30%)</th>
                        <th>Cuối kỳ (60%)</th>
                        <th>Điểm hệ 10</th>
                        <th>Điểm chữ</th>
                        <th>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrades.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Chưa có dữ liệu bảng điểm học kỳ này hoặc điểm chưa được công bố
                          </td>
                        </tr>
                      ) : (
                        filteredGrades.map((g) => (
                          <tr key={g._id}>
                            <td>
                              <strong>{g.course?.code || '-'}</strong>
                            </td>
                            <td>{g.course?.name || '-'}</td>
                            <td>{g.course?.credits || 3}</td>
                            <td>{g.attendanceScore}</td>
                            <td>{g.midtermScore}</td>
                            <td>{g.finalScore}</td>
                            <td>
                              <strong style={{ color: '#60a5fa' }}>{g.totalScore10}</strong>
                            </td>
                            <td>
                              <span className={`badge ${g.letterGrade === 'F' ? 'badge-danger' : 'badge-info'}`}>
                                {g.letterGrade}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${g.isPassed ? 'badge-success' : 'badge-danger'}`}>
                                {g.isPassed ? (
                                  <>
                                    <i className="fa-solid fa-check"></i> Đạt
                                  </>
                                ) : (
                                  <>
                                    <i className="fa-solid fa-xmark"></i> Học lại
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>


        <div className="glass-panel">
          <div className="panel-header">
            <h3>
              <i className="fa-solid fa-bullhorn"></i> Danh Sách Thông Báo Học Vụ & Giảng Viên
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {announcements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                Không có thông báo mới
              </div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a._id}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                      {a.category}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                      <i className="fa-regular fa-clock"></i> {a.date}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '13.5px', color: '#fff', marginBottom: '4px' }}>{a.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45' }}>{a.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
