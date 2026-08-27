import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function AttendancePage({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, [currentUser]);

  const loadAttendance = async () => {
    setLoading(true);
    const secRes = await api.getClassSections();
    const loadedRows = [];

    if (secRes.success && secRes.data) {
      for (const section of secRes.data) {
        const repRes = await api.getAttendanceReport(section._id);
        if (repRes.success && repRes.studentStats) {
          const myStat = repRes.studentStats.find(
            (s) => s.student._id?.toString() === (currentUser?.id || '')
          );
          if (myStat) {
            loadedRows.push({
              sectionCode: section.sectionCode,
              courseName: section.course?.name,
              ...myStat
            });
          }
        }
      }
    }
    setRows(loadedRows);
    setLoading(false);
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h3>
          <i className="fa-solid fa-clipboard-user"></i> Theo Dõi Số Buổi Chuyên Cần & Cảnh Báo Cấm Thi (&gt; 20%)
        </h3>
        <button className="btn btn-secondary btn-sm" onClick={loadAttendance}>
          <i className="fa-solid fa-rotate"></i> Làm mới
        </button>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã LHP</th>
              <th>Môn Học</th>
              <th>Có Mặt</th>
              <th>Đi Muộn</th>
              <th>Vắng Có Phép</th>
              <th>Vắng K.Phép</th>
              <th>Tỷ Lệ Vắng (%)</th>
              <th>Điều Kiện Dự Thi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Đang tải dữ liệu chuyên cần...' : 'Chưa có dữ liệu chuyên cần'}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <code>{row.sectionCode}</code>
                  </td>
                  <td>
                    <strong>{row.courseName}</strong>
                  </td>
                  <td>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>{row.presentCount}</span>
                  </td>
                  <td>
                    <span style={{ color: '#fbbf24' }}>{row.lateCount}</span>
                  </td>
                  <td>{row.excusedCount}</td>
                  <td>
                    <span style={{ color: '#f87171', fontWeight: 600 }}>{row.unexcusedCount}</span>
                  </td>
                  <td>
                    <strong>{row.absencePercentage}%</strong>
                  </td>
                  <td>
                    <span className={`badge ${row.isBannedFromExam ? 'badge-danger' : 'badge-success'}`}>
                      {row.isBannedFromExam ? (
                        <>
                          <i className="fa-solid fa-triangle-exclamation"></i> CẤM THI (&gt;20%)
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-circle-check"></i> Đủ điều kiện
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
    </div>
  );
}
