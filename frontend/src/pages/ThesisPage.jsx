import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';

export default function ThesisPage({ currentUser, onOpenAuth }) {
  const [theses, setTheses] = useState([]);
  const [title, setTitle] = useState('');
  const [milestone, setMilestone] = useState('M1');
  const [desc, setDesc] = useState('');
  const [advisorId, setAdvisorId] = useState('');
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadTheses();
    loadAdvisors();
  }, [currentUser]);

  const loadTheses = async () => {
    const res = await api.getTheses();
    if (res.success && res.data) {
      setTheses(res.data);
    }
  };

  const loadAdvisors = async () => {
    const res = await api.getAdvisors();
    if (res.success && res.data) {
      setAdvisors(res.data);
      if (res.data.length > 0) setAdvisorId(res.data[0]._id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    const fileName = fileInputRef.current?.files?.[0]?.name || 'BaoCao_LuanVan.pdf';

    if (!advisorId) {
      alert('❌ Vui lòng chọn giảng viên hướng dẫn');
      setLoading(false);
      return;
    }

    const res = await api.registerThesis({
      topicTitle: title.trim(),
      description: `[${milestone} - File: ${fileName}] ${desc.trim()}`,
      advisorId,
      studentId: currentUser.id
    });

    setLoading(false);

    if (res.success) {
      alert(`✅ Nộp báo cáo đồ án / luận văn thành công (${milestone})! Giảng viên hướng dẫn sẽ tiến hành duyệt.`);
      setTitle('');
      setDesc('');
      setAdvisorId(advisors.length > 0 ? advisors[0]._id : '');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadTheses();
    } else {
      alert(`❌ Lỗi: ${res.message}`);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px' }}>
      <div className="glass-panel">
        <div className="panel-header">
          <h3>
            <i className="fa-solid fa-file-arrow-up"></i> Nộp Báo Cáo Đồ Án / Luận Văn
          </h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên Đề tài Đồ án / Luận văn tốt nghiệp:</label>
            <input
              type="text"
              className="form-control"
              placeholder="VD: Nghiên cứu Kiến trúc Back-end..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Giảng viên hướng dẫn: <span style={{ color: '#ef4444' }}>*</span></label>
            <select
              className="form-control"
              value={advisorId}
              onChange={(e) => setAdvisorId(e.target.value)}
              required
              style={{ color: '#111827' }}
            >
              <option value="">-- Chọn giảng viên hướng dẫn --</option>
              {advisors.map(a => (
                <option key={a._id} value={a._id}>{a.name} ({a.code || a.email})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Chọn mốc tiến độ nộp:</label>
            <select
              className="form-control"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
            >
              <option value="M1">Mốc 1: Nộp Đề Cương Chi Tiết & Kế Hoạch</option>
              <option value="M2">Mốc 2: Báo Cáo Tiến Độ Giữa Kỳ</option>
              <option value="M3">Mốc 3: Nộp Bản Thảo Báo Cáo Cuối Cùng</option>
              <option value="M4">Mốc 4: Nộp Slide & Source Code Bảo Vệ</option>
            </select>
          </div>

          <div className="form-group">
            <label>File báo cáo / Tài liệu đính kèm (PDF, DOCX, ZIP):</label>
            <input
              type="file"
              ref={fileInputRef}
              className="form-control"
              accept=".pdf,.doc,.docx,.zip,.rar"
            />
          </div>

          <div className="form-group">
            <label>Tóm tắt nội dung báo cáo & kết quả đạt được:</label>
            <textarea
              className="form-control"
              style={{ minHeight: '100px' }}
              placeholder="Mô tả tóm tắt nội dung đã hoàn thành..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang nộp...
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up"></i> Nộp Báo Cáo Luận Văn Ngay
              </>
            )}
          </button>
        </form>
      </div>

      <div className="glass-panel">
        <div className="panel-header">
          <h3>
            <i className="fa-solid fa-list-check"></i> Tiến Độ Các Mốc (M1 - M4) & Kết Quả Phê Duyệt
          </h3>
        </div>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Đề Tài</th>
                <th>Tên Đề Tài Tốt Nghiệp</th>
                <th>Tiến Độ M1 - M4</th>
                <th>Ngày Bảo Vệ & Phòng</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {theses.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa đăng ký đề tài tốt nghiệp
                  </td>
                </tr>
              ) : (
                theses.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <code>{t.topicCode}</code>
                    </td>
                    <td>
                      <strong>{t.topicTitle}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {(t.milestones || []).map((m, idx) => (
                          <span
                            key={idx}
                            className={`badge ${
                              m.status === 'Đã duyệt'
                                ? 'badge-success'
                                : m.status === 'Đã nộp'
                                ? 'badge-info'
                                : 'badge-secondary'
                            }`}
                            title={`${m.name}: ${m.status}`}
                            style={{ fontSize: '10px', padding: '2px 7px' }}
                          >
                            M{idx + 1} ({m.status})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <small>{t.defenseDate || '-'}</small>
                      <br />
                      <small style={{ color: '#60a5fa' }}>{t.defenseRoom || ''}</small>
                    </td>
                    <td>
                      <span className="badge badge-success">{t.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
