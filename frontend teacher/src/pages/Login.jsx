import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../store/authSlice';
import axios from '../utils/axiosConfig';

function Login() {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await axios.post('/auth/login', { code, password });
            if (response.data.success) {
                dispatch(loginSuccess(response.data));
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b1120',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Ambient Background Glows */}
            <div style={{
                position: 'absolute', top: '-10%', left: '-10%',
                width: '500px', height: '500px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
                filter: 'blur(80px)', animation: 'authOrb2 10s ease-in-out infinite alternate',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: '40%', left: '60%',
                width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
                filter: 'blur(50px)', animation: 'authOrb1 12s ease-in-out infinite alternate-reverse',
                pointerEvents: 'none',
            }} />

            <style>{`
                @keyframes authOrb1 {
                    from { transform: translate(0, 0) scale(1); }
                    to   { transform: translate(40px, 30px) scale(1.1); }
                }
                @keyframes authOrb2 {
                    from { transform: translate(0, 0) scale(1); }
                    to   { transform: translate(-30px, -40px) scale(1.08); }
                }
                @keyframes authFadeIn {
                    from { opacity: 0; transform: translateY(30px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .auth-input {
                    width: 100%;
                    padding: 13px 16px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 10px;
                    color: #fff;
                    font-size: 14px;
                    font-family: inherit;
                    transition: all 0.25s ease;
                    box-sizing: border-box;
                    outline: none;
                }
                .auth-input::placeholder { color: rgba(255,255,255,0.3); }
                .auth-input:focus {
                    border-color: #6366f1;
                    background: rgba(99,102,241,0.08);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
                }
                .auth-btn {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #6366f1, #a855f7);
                    border: none;
                    border-radius: 10px;
                    color: #fff;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    letter-spacing: 0.3px;
                }
                .auth-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #4f46e5, #9333ea);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 24px rgba(99,102,241,0.4);
                }
                .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; }
            `}</style>

            {/* Login Card */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '420px',
                margin: '0 20px',
                background: 'rgba(17,24,39,0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '40px 36px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                animation: 'authFadeIn 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}>
                {/* Logo & Title */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '72px', height: '72px',
                        background: '#fff',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                        padding: '8px',
                    }}>
                        <img src="/vus_logo.png" alt="VUS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{
                        fontSize: '22px', fontWeight: 700, color: '#fff',
                        margin: '0 0 6px', letterSpacing: '-0.3px',
                    }}>
                        Cổng Thông Tin Giảng Viên
                    </h1>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                        Hệ thống Quản lý Sinh viên — Đăng nhập để tiếp tục
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '12px', marginBottom: '20px', borderRadius: '8px',
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#fca5a5', fontSize: '13px', textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block', fontSize: '12px', fontWeight: 600,
                            color: 'rgba(255,255,255,0.55)', marginBottom: '7px',
                            textTransform: 'uppercase', letterSpacing: '0.6px',
                        }}>
                            Mã Giảng Viên
                        </label>
                        <input
                            className="auth-input"
                            type="text"
                            placeholder="VD: GV001..."
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block', fontSize: '12px', fontWeight: 600,
                            color: 'rgba(255,255,255,0.55)', marginBottom: '7px',
                            textTransform: 'uppercase', letterSpacing: '0.6px',
                        }}>
                            Mật Khẩu
                        </label>
                        <input
                            className="auth-input"
                            type="password"
                            placeholder="Nhập mật khẩu..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button className="auth-btn" type="submit" disabled={loading}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;

