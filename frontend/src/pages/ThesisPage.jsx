import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const EMPTY_MILESTONE = { name: '', note: '' };

export default function ThesisPage({ currentUser, onOpenAuth }) {
  const [theses, setTheses] = useState([]);
  const [title, setTitle] = useState('');
  const [milestone, setMilestone] = useState('M1');
  const [desc, setDesc] = useState('');
  const [advisorId, setAdvisorId] = useState('');
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [milestoneModal, setMilestoneModal] = useState(null);
  const [milestoneFiles, setMilestoneFiles] = useState([]);
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);

  // Modal nộp thêm file vào đồ án (không ghi đè file cũ)
  const [additionalFilesModal, setAdditionalFilesModal] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [additionalSubmitting, setAdditionalSubmitting] = useState(false);
  const additionalFileInputRef = useRef(null);

  // Sinh viên tự điền mốc tiến độ (luôn hiển thị, bắt đầu với 1 mốc)
  const [customMilestones, setCustomMilestones] = useState([{ ...EMPTY_MILESTONE }]);

  // Modal chỉnh sửa mốc tiến độ đã đăng ký
  const [editMilestoneModal, setEditMilestoneModal] = useState(null);
  const [editMilestoneSaving, setEditMilestoneSaving] = useState(false);
  
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
      if (res.data.length > 0 && !advisorId) setAdvisorId(res.data[0]._id);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFileError('');
    if (files.length === 0) return;

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      setFileError(`⚠️ Có ${oversized.length} file vượt quá giới hạn tối đa cho phép (${MAX_FILE_SIZE_MB} MB). Vui lòng nén file hoặc chọn file nhỏ hơn.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // NỐI THÊM FILE VÀO DANH SÁCH, KHÔNG GHI ĐÈ CÁC FILE ĐÃ CHỌN TRƯỚC ĐÓ
    setSelectedFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}_${f.size}`));
      const newFiles = files.filter(f => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...newFiles];
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveSelectedFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCustomMilestoneChange = (idx, field, value) => {
    setCustomMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleAddMilestone = () => {
    setCustomMilestones(prev => [...prev, { ...EMPTY_MILESTONE }]);
    // Chọn mốc mới thêm vào làm mốc nộp
    setMilestone(`M${customMilestones.length + 1}`);
  };

  const handleRemoveMilestone = (idx) => {
    if (customMilestones.length <= 1) return;
    const newList = customMilestones.filter((_, i) => i !== idx);
    setCustomMilestones(newList);
    // Nếu xoá mốc đang chọn, reset về M1
    if (milestone === `M${idx + 1}`) setMilestone('M1');
    else if (parseInt(milestone.slice(1)) > idx + 1) {
      setMilestone(`M${parseInt(milestone.slice(1)) - 1}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!advisorId) {
      alert('❌ Vui lòng chọn giảng viên hướng dẫn');
      return;
    }

    // Kiểm tra tên mốc
    for (let i = 0; i < customMilestones.length; i++) {
      if (!customMilestones[i].name.trim()) { alert(`❌ Vui lòng điền tên cho Mốc ${i + 1}`); return; }
    }

    try {
      setLoading(true);
      setUploadProgress('Đang tải file dự án lên máy chủ...');

      const formData = new FormData();
      formData.append('topicTitle', title.trim());
      formData.append('description', desc.trim());
      formData.append('advisorId', advisorId);
      formData.append('studentId', currentUser.id || currentUser._id);
      formData.append('milestone', milestone);

      // Gửi tên và ghi chú từng mốc do sinh viên tự điền
      formData.append('milestoneCount', customMilestones.length);
      customMilestones.forEach((m, i) => {
        formData.append(`m${i + 1}Name`, m.name);
        formData.append(`m${i + 1}Note`, m.note || '');
      });

      // Gửi toàn bộ file đã chọn (hỗ trợ nhiều file, không ghi đè)
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await api.registerThesis(formData);
      setLoading(false);
      setUploadProgress(null);

      if (res.success) {
        alert(`✅ Đăng ký đề tài thành công! Đã nộp ${selectedFiles.length} file đính kèm.`);
        setTitle('');
        setDesc('');
        setSelectedFiles([]);
        setCustomMilestones([{ ...EMPTY_MILESTONE }]);
        setMilestone('M1');
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadTheses();
      } else {
        alert(`❌ Lỗi: ${res.message || 'Không thể đăng ký đề tài'}`);
      }
    } catch (err) {
      setLoading(false);
      setUploadProgress(null);
      alert(`❌ Lỗi tải file: ${err.message}`);
    }
  };

  // Nộp file cho từng tiến độ (hỗ trợ nhiều file, không ghi đè)
  const handleMilestoneSubmit = async (e) => {
    e.preventDefault();
    if (!milestoneModal || milestoneFiles.length === 0) return;

    try {
      setMilestoneSubmitting(true);
      const res = await api.uploadMilestoneFile(milestoneModal.thesisId, milestoneModal.milestoneIndex, milestoneFiles);
      setMilestoneSubmitting(false);

      if (res.success) {
        alert(`✅ Đã nộp thành công ${milestoneFiles.length} file cho tiến độ! Toàn bộ file đã nộp trước đó đều được lưu giữ.`);
        setMilestoneModal(null);
        setMilestoneFiles([]);
        loadTheses();
      } else {
        alert(`❌ Lỗi: ${res.message}`);
      }
    } catch (err) {
      setMilestoneSubmitting(false);
      alert(`❌ Lỗi: ${err.message}`);
    }
  };

  // Nộp thêm file vào đồ án bất kỳ lúc nào (không ghi đè file cũ)
  const handleAdditionalSubmit = async (e) => {
    e.preventDefault();
    if (!additionalFilesModal || additionalFiles.length === 0) return;

    try {
      setAdditionalSubmitting(true);
      const res = await api.uploadAdditionalFiles(additionalFilesModal.thesisId, additionalFiles);
      setAdditionalSubmitting(false);

      if (res.success) {
        alert(`✅ Đã nộp thêm ${additionalFiles.length} file thành công! Các file cũ đều được bảo toàn.`);
        setAdditionalFilesModal(null);
        setAdditionalFiles([]);
        loadTheses();
      } else {
        alert(`❌ Lỗi: ${res.message || 'Không thể nộp thêm file'}`);
      }
    } catch (err) {
      setAdditionalSubmitting(false);
      alert(`❌ Lỗi: ${err.message}`);
    }
  };

  // Sinh viên lưu chỉnh sửa mốc tiến độ đã đăng ký
  const handleSaveEditMilestone = async (e) => {
    e.preventDefault();
    if (!editMilestoneModal) return;
    if (!editMilestoneModal.name.trim()) { alert('❌ Tên mốc không được để trống!'); return; }
    try {
      setEditMilestoneSaving(true);
      const res = await api.updateMilestoneInfo(
        editMilestoneModal.thesisId,
        editMilestoneModal.milestoneIndex,
        { name: editMilestoneModal.name, note: editMilestoneModal.note }
      );
      setEditMilestoneSaving(false);
      if (res.success) {
        alert(`✅ Đã cập nhật mốc thành công!`);
        setEditMilestoneModal(null); loadTheses();
      } else { alert(`❌ Lỗi: ${res.message}`); }
    } catch (err) { setEditMilestoneSaving(false); alert(`❌ Lỗi: ${err.message}`); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: '20px' }}>
      {/* Form Nộp Đề Tài & File Dự Án */}
      <div className="glass-panel">
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>
            <i className="fa-solid fa-file-arrow-up" style={{ color: '#4f46e5' }}></i> Nộp Đồ Án / Luận Văn
          </h3>
          <span className="badge badge-info" style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', fontWeight: 600 }}>
            Tối đa {MAX_FILE_SIZE_MB} MB
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Tên Đề tài Đồ án / Luận văn tốt nghiệp: <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="VD: Xây dựng hệ thống Microservices & Backend..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Giảng viên hướng dẫn: <span style={{ color: '#ef4444' }}>*</span></label>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <i className="fa-solid fa-flag-checkered" style={{ color: '#4f46e5' }}></i>
                Các Mốc Tiến Độ:
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <button
                type="button"
                onClick={handleAddMilestone}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color: 'white', border: 'none', borderRadius: '7px',
                  padding: '5px 12px', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.25)'
                }}
              >
                <i className="fa-solid fa-plus"></i> Thêm mốc
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {customMilestones.map((m, idx) => (
                <div key={idx} style={{
                  border: `1.5px solid ${milestone === `M${idx + 1}` ? '#6366f1' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '10px 12px',
                  background: milestone === `M${idx + 1}` ? '#f5f3ff' : '#f8fafc',
                  transition: 'all 0.15s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Ô nhập tên mốc */}
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '13px', padding: '6px 10px', flex: 1, fontWeight: 600 }}
                      placeholder={`Tên tiến độ ${idx + 1} (VD: Nộp đề cương, Báo cáo phần mềm...)`}
                      value={m.name}
                      onChange={(e) => handleCustomMilestoneChange(idx, 'name', e.target.value)}
                      required
                    />

                    {/* Radio chọn mốc nộp */}
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '3px',
                      fontSize: '11px', color: '#4f46e5', fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0
                    }}>
                      <input
                        type="radio"
                        name="initialMilestone"
                        value={`M${idx + 1}`}
                        checked={milestone === `M${idx + 1}`}
                        onChange={() => setMilestone(`M${idx + 1}`)}
                        style={{ accentColor: '#4f46e5', width: '13px', height: '13px' }}
                      />
                      Nộp
                    </label>

                    {/* Nút xóa mốc */}
                    {customMilestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        title="Xóa tiến độ này"
                        style={{
                          background: '#fef2f2', border: '1px solid #fca5a5',
                          color: '#dc2626', borderRadius: '6px',
                          width: '28px', height: '28px', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0, fontSize: '12px'
                        }}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>

                  {/* Ô tự nhập ghi chú tiến độ */}
                  <div style={{ marginTop: '7px' }}>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '12px', padding: '5px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder={`📝 Ghi chú cho tiến độ ${idx + 1} (Bạn tự nhập ghi chú theo ý muốn...)`}
                      value={m.note || ''}
                      onChange={(e) => handleCustomMilestoneChange(idx, 'note', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              {/* Nút thêm mốc (phiên bản phụ dưới danh sách) */}
              <button
                type="button"
                onClick={handleAddMilestone}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  border: '1.5px dashed #a5b4fc', background: '#f5f3ff',
                  color: '#4f46e5', borderRadius: '8px',
                  padding: '8px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', width: '100%'
                }}
              >
                <i className="fa-solid fa-plus"></i> Thêm mốc tiến độ mới
              </button>

              <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', paddingLeft: '2px' }}>
                💡 Chọn mốc bạn muốn nộp file ngay bây giờ. Các mốc còn lại có thể nộp bổ sung sau.
              </div>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 600, margin: 0 }}>
                File dự án / Báo cáo đính kèm:
              </label>
              <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
                Giới hạn: ≤ {MAX_FILE_SIZE_MB} MB
              </span>
            </div>

            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer'
            }} onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                accept=".pdf,.doc,.docx,.zip,.rar,.7z,.ppt,.pptx,.tar,.gz"
                onChange={handleFileChange}
              />
              <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '28px', color: '#4f46e5', marginBottom: '6px' }}></i>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                {selectedFiles.length > 0 ? `Đã chọn ${selectedFiles.length} file (Bấm để chọn thêm file khác)` : 'Nhấn để chọn một hoặc nhiều file dự án'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                Hỗ trợ nộp nhiều file cùng lúc: PDF, DOCX, ZIP, RAR, 7Z, PPTX (Tối đa {MAX_FILE_SIZE_MB} MB/file)
              </p>
            </div>

            {/* Danh sách các file đã chọn */}
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca', display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
                  <span>📁 Danh sách file sẽ nộp ({selectedFiles.length} file):</span>
                  <span>Tổng: {formatFileSize(selectedFiles.reduce((acc, f) => acc + f.size, 0))}</span>
                </div>
                {selectedFiles.map((f, idx) => (
                  <div key={idx} style={{
                    padding: '6px 10px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#166534'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <i className="fa-solid fa-file" style={{ color: '#16a34a' }}></i>
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }} title={f.name}>{f.name}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>({formatFileSize(f.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveSelectedFile(idx); }}
                      title="Xóa file này khỏi danh sách nộp"
                      style={{
                        border: 'none', background: 'transparent',
                        color: '#ef4444', cursor: 'pointer',
                        fontSize: '14px', padding: '0 4px'
                      }}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fileError && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#b91c1c'
              }}>
                {fileError}
              </div>
            )}
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Tóm tắt nội dung báo cáo & kết quả đạt được:</label>
            <textarea
              className="form-control"
              style={{ minHeight: '90px' }}
              placeholder="Mô tả tóm tắt tính năng hoặc nội dung hoàn thành..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            ></textarea>
          </div>

          {uploadProgress && (
            <div style={{ padding: '8px 12px', marginBottom: '12px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', color: '#1e40af' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
              {uploadProgress}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 600 }} disabled={loading}>
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang tải file lên & đăng ký...
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up"></i> Nộp Báo Cáo & File Đồ Án Ngay
              </>
            )}
          </button>
        </form>
      </div>

      {/* Danh Sách Đồ Án & Tải File Dự Án */}
      <div className="glass-panel">
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>
            <i className="fa-solid fa-list-check" style={{ color: '#4f46e5' }}></i> Đồ Án Của Tôi & Tiến Độ Các Mốc
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {theses.length} đề tài
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Đề Tài</th>
                <th>Tên Đề Tài & GVHD</th>
                <th>File Dự Án Đính Kèm</th>
                <th>Các Mốc Tiến Độ</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {theses.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Chưa đăng ký đề tài tốt nghiệp nào
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
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        GVHD: <strong>{t.advisor?.name || 'Chưa phân công'}</strong>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const fileList = (t.files && t.files.length > 0)
                          ? t.files
                          : (t.submittedFileName ? [{ fileName: t.submittedFileName, fileSize: t.submittedFileSize }] : []);

                        return (
                          <div>
                            {fileList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca' }}>
                                  📁 {fileList.length} file đính kèm:
                                </div>
                                {fileList.map((f, fIdx) => (
                                  <div key={fIdx} style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '5px',
                                    padding: '4px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px'
                                  }}>
                                    <div style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }} title={f.fileName || f.submittedFileName}>
                                      📄 <strong>{f.fileName || f.submittedFileName || `File_${fIdx + 1}`}</strong>
                                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                                        {formatFileSize(f.fileSize || f.submittedFileSize)}
                                      </span>
                                    </div>
                                    <a
                                      href={api.getThesisDownloadUrl(t._id, fIdx)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: '#4338ca',
                                        background: '#e0e7ff',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        textDecoration: 'none',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      Tải
                                    </a>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Chưa đính kèm file</span>
                            )}

                            {/* Nút nộp thêm file vào đồ án */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdditionalFilesModal({ thesisId: t._id, topicTitle: t.topicTitle });
                                setAdditionalFiles([]);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '6px',
                                border: '1px dashed #6366f1',
                                background: '#f5f3ff',
                                color: '#4f46e5',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <i className="fa-solid fa-cloud-arrow-up"></i> + Nộp thêm file
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {(t.milestones || []).map((m, idx) => (
                          <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px' }}>
                            {/* Tên mốc + nút sửa */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                                {m.name.startsWith('Tiến độ') || m.name.match(/^\d+\./) ? m.name : `Tiến độ ${idx + 1}: ${m.name}`}
                              </span>
                              {m.status !== 'Đã duyệt' && (
                                <button
                                  type="button"
                                  title="Chỉnh sửa tên / ghi chú mốc"
                                  onClick={() => setEditMilestoneModal({
                                    thesisId: t._id, milestoneIndex: idx,
                                    name: m.name,
                                    note: m.studentNote || m.note || ''
                                  })}
                                  style={{ border: 'none', background: '#e0e7ff', color: '#4338ca', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                                >
                                  ✏️ Sửa
                                </button>
                              )}
                            </div>
                            {/* Ghi chú sinh viên tự nhập */}
                            {(m.studentNote || m.note) ? (
                              <div style={{ fontSize: '11px', color: '#4338ca', marginTop: '3px', background: '#eef2ff', padding: '3px 7px', borderRadius: '5px' }}>
                                📝 <strong>Ghi chú:</strong> {m.studentNote || m.note}
                              </div>
                            ) : null}

                            {/* Danh sách file của mốc (nếu có nhiều file) */}
                            {m.files && m.files.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                {m.files.map((mf, mfIdx) => (
                                  <div key={mfIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#334155' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={mf.fileName}>
                                      📎 {mf.fileName}
                                    </span>
                                    <a href={api.getMilestoneDownloadUrl(t._id, idx, mfIdx)} target="_blank" rel="noopener noreferrer"
                                      style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                                      Tải
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Status & file action */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                              <span className={`badge ${m.status === 'Đã duyệt' ? 'badge-success' : m.status === 'Đã nộp' ? 'badge-info' : 'badge-secondary'}`}
                                style={{ fontSize: '10px', padding: '1px 5px' }}>{m.status}</span>
                              <button type="button"
                                onClick={() => {
                                  setMilestoneModal({ thesisId: t._id, milestoneIndex: idx, milestoneName: m.name });
                                  setMilestoneFiles([]);
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#0284c7', cursor: 'pointer', fontSize: '10px', padding: 0, textDecoration: 'underline' }}>
                                + {(m.files && m.files.length > 0) || m.submittedFileName ? 'Nộp thêm file' : 'Nộp file'}
                              </button>
                            </div>
                            {/* Điểm nếu có */}
                            {m.score != null && <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>Điểm: {m.score}/10</div>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success" style={{ fontSize: '11px' }}>{t.status}</span>
                      {t.finalScore != null && (
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', marginTop: '3px' }}>
                          Điểm: {t.finalScore}/10
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nộp File Cho Tiến Độ */}
      {milestoneModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '24px',
            width: '460px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)'
          }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#4f46e5', marginRight: '6px' }}></i>
              Nộp File Cho {milestoneModal.milestoneName}
            </h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>
              Bạn có thể chọn nộp một hoặc nhiều file (PDF, DOCX, ZIP, RAR, 7Z, PPTX). Các file cũ trước đó đều được bảo toàn.
            </p>

            <form onSubmit={handleMilestoneSubmit}>
              <div className="form-group">
                <input
                  type="file"
                  className="form-control"
                  multiple
                  accept=".pdf,.doc,.docx,.zip,.rar,.7z,.ppt,.pptx,.tar,.gz"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const oversized = files.filter(f => f.size > MAX_FILE_SIZE_BYTES);
                    if (oversized.length > 0) {
                      alert(`⚠️ Có file vượt quá giới hạn tối đa ${MAX_FILE_SIZE_MB} MB!`);
                      return;
                    }
                    setMilestoneFiles(prev => {
                      const keys = new Set(prev.map(f => `${f.name}_${f.size}`));
                      return [...prev, ...files.filter(f => !keys.has(`${f.name}_${f.size}`))];
                    });
                  }}
                  required={milestoneFiles.length === 0}
                />
              </div>

              {milestoneFiles.length > 0 && (
                <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>
                    Đã chọn {milestoneFiles.length} file:
                  </div>
                  {milestoneFiles.map((f, i) => (
                    <div key={i} style={{
                      padding: '4px 8px', background: '#ecfdf5', borderRadius: '5px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#065f46'
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
                        📎 {f.name} ({formatFileSize(f.size)})
                      </span>
                      <button type="button" onClick={() => setMilestoneFiles(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setMilestoneModal(null); setMilestoneFiles([]); }}
                  disabled={milestoneSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={milestoneSubmitting || milestoneFiles.length === 0}
                >
                  {milestoneSubmitting ? 'Đang tải lên...' : `Tải Lên (${milestoneFiles.length} File)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nộp Thêm File Vào Đồ Án */}
      {additionalFilesModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '24px',
            width: '480px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)'
          }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#4f46e5', marginRight: '6px' }}></i>
              Nộp Thêm File Cho Đồ Án
            </h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>
              Đề tài: <strong>{additionalFilesModal.topicTitle}</strong><br />
              💡 File mới sẽ được thêm vào danh sách, <strong>không ghi đè</strong> lên các file bạn đã nộp trước đó.
            </p>

            <form onSubmit={handleAdditionalSubmit}>
              <div className="form-group">
                <input
                  type="file"
                  className="form-control"
                  multiple
                  ref={additionalFileInputRef}
                  accept=".pdf,.doc,.docx,.zip,.rar,.7z,.ppt,.pptx,.tar,.gz"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const oversized = files.filter(f => f.size > MAX_FILE_SIZE_BYTES);
                    if (oversized.length > 0) {
                      alert(`⚠️ Có file vượt quá giới hạn tối đa ${MAX_FILE_SIZE_MB} MB!`);
                      return;
                    }
                    setAdditionalFiles(prev => {
                      const keys = new Set(prev.map(f => `${f.name}_${f.size}`));
                      return [...prev, ...files.filter(f => !keys.has(`${f.name}_${f.size}`))];
                    });
                  }}
                  required={additionalFiles.length === 0}
                />
              </div>

              {additionalFiles.length > 0 && (
                <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#4338ca' }}>
                    Sẽ nộp thêm {additionalFiles.length} file:
                  </div>
                  {additionalFiles.map((f, i) => (
                    <div key={i} style={{
                      padding: '4px 8px', background: '#f5f3ff', borderRadius: '5px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#4338ca'
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' }}>
                        📄 {f.name} ({formatFileSize(f.size)})
                      </span>
                      <button type="button" onClick={() => setAdditionalFiles(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setAdditionalFilesModal(null); setAdditionalFiles([]); }}
                  disabled={additionalSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={additionalSubmitting || additionalFiles.length === 0}
                >
                  {additionalSubmitting ? 'Đang tải lên...' : `Nộp Thêm (${additionalFiles.length} File)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Mốc Tiến Độ */}
      {editMilestoneModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '460px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              <i className="fa-solid fa-pen-to-square" style={{ color: '#4f46e5', marginRight: '6px' }}></i>
              Chỉnh Sửa Tiến Độ {editMilestoneModal.milestoneIndex + 1}
            </h4>
            <form onSubmit={handleSaveEditMilestone}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '13px' }}>Tên mốc: <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" className="form-control" placeholder="Nhập tên mốc tiến độ..."
                  value={editMilestoneModal.name}
                  onChange={(e) => setEditMilestoneModal(v => ({ ...v, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '13px' }}>Ghi chú của bạn:</label>
                <textarea className="form-control" style={{ minHeight: '70px' }}
                  placeholder="Nhập ghi chú thêm cho mốc này..."
                  value={editMilestoneModal.note}
                  onChange={(e) => setEditMilestoneModal(v => ({ ...v, note: e.target.value }))} />
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px', fontStyle: 'italic' }}>
                ℹ️ Trạng thái và điểm do giảng viên quản lý. Bạn có thể sửa tên và ghi chú mốc.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setEditMilestoneModal(null)} disabled={editMilestoneSaving}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={editMilestoneSaving}>
                  {editMilestoneSaving
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
                    : <><i className="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
