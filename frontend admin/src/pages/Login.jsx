import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await api.login(code, password);
    setLoading(false);

    if (res.success && res.user && res.user.role === 'admin') {
      localStorage.setItem('adminToken', res.token);
      localStorage.setItem('adminUser', JSON.stringify(res.user));
      navigate('/');
    } else if (res.success) {
      setError('Tài khoản này không có quyền quản trị!');
    } else {
      setError(res.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    }
  };

  return (
    <div className="login-page">
      {/* Background Orbs */}
      <div className="login-orb" style={{ top: '-150px', left: '-150px', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)' }} />
      <div className="login-orb" style={{ bottom: '-200px', right: '-150px', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)' }} />

      <div className="login-card">
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
          }}>
            <i className="fa-solid fa-shield-halved" style={{ fontSize: '28px', color: '#fff' }}></i>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Hệ thống Quản lý Đào Tạo — Phòng Đào Tạo
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
              color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <i className="fa-solid fa-circle-exclamation"></i> {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Tên Đăng Nhập
            </label>
            <input
              className="auth-input"
              type="text"
              placeholder="Nhập mã admin hoặc email..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Mật Khẩu
            </label>
            <input
              className="auth-input"
              type="password"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Đang xác thực...</>
            ) : (
              <><i className="fa-solid fa-right-to-bracket"></i> Đăng Nhập</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
