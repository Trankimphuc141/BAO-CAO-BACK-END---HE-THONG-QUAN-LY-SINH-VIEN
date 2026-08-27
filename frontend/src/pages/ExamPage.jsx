import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function ExamPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    const res = await api.getExamSchedules();
    if (res.success && res.data) {
      setExams(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h3>
          <i className="fa-solid fa-pen-ruler"></i> Tra Cứu Lịch Thi Kết Thúc Học Phần & Phòng Thi
        </h3>
        <button className="btn btn-secondary btn-sm" onClick={loadExams}>
          <i className="fa-solid fa-rotate"></i> Làm mới
        </button>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Môn Thi</th>
              <th>Mã LHP</th>
              <th>Ngày Thi</th>
              <th>Khung Giờ</th>
              <th>Phòng Thi</th>
              <th>Hình Thức Thi</th>
              <th>Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Đang tải lịch thi...' : 'Chưa có lịch thi'}
                </td>
              </tr>
            ) : (
              exams.map((e) => (
                <tr key={e._id}>
                  <td>
                    <strong>{e.course?.name}</strong> ({e.course?.code})
                  </td>
                  <td>{e.classSection?.sectionCode || 'Chung'}</td>
                  <td>
                    <i className="fa-regular fa-calendar"></i> {e.examDate}
                  </td>
                  <td>
                    <i className="fa-regular fa-clock"></i> {e.startTime} - {e.endTime}
                  </td>
                  <td>
                    <strong style={{ color: '#60a5fa' }}>{e.room}</strong>
                  </td>
                  <td>
                    <span className="badge badge-info">{e.format}</span>
                  </td>
                  <td>
                    <span className="badge badge-success">{e.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
