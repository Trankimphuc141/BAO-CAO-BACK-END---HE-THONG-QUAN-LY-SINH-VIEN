import React, { useState } from 'react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [code, setCode] = useState('SV001');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await api.login(code.trim(), password.trim());
    setLoading(false);

    if (res.success) {
      alert(`👋 Xin chào sinh viên ${res.user.name} (${res.user.code})!`);
      onLoginSuccess(res.user);
      onClose();
    } else {
      alert(`❌ Đăng nhập thất bại: ${res.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-user-lock"></i> Đăng Nhập Cổng Sinh Viên
          </h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Mã Sinh Viên (VD: SV2026_01, SV001...):</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập mã sinh viên..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu:</label>
              <input
                type="password"
                className="form-control"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-arrow-right-to-bracket"></i> Đăng Nhập
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
