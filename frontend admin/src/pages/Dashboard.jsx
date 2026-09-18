import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const Dashboard = ({ adminUser }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

        const [studRes, teachRes] = await Promise.all([
          fetch(`${BASE}/admin/users?role=student&limit=1`, { headers }).catch(() => null),
          fetch(`${BASE}/admin/users?role=teacher&limit=1`, { headers }).catch(() => null),
        ]);

        const studData = studRes?.ok ? await studRes.json() : {};
        const teachData = teachRes?.ok ? await teachRes.json() : {};

        setStats({
          students: studData.total ?? studData.count ?? studData.data?.length ?? '—',
          teachers: teachData.total ?? teachData.count ?? teachData.data?.length ?? '—',
        });
      } catch (err) {
        setStats({ students: '—', teachers: '—' });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Tổng Sinh Viên', icon: 'fa-user-graduate',
      value: loading ? null : stats?.students,
      color: '#2563eb', bg: 'rgba(37,99,235,0.1)',
      desc: 'Đã đăng ký trong hệ thống',
      onClick: () => navigate('/students'),
    },
    {
      title: 'Tổng Giảng Viên', icon: 'fa-chalkboard-user',
      value: loading ? null : stats?.teachers,
      color: '#059669', bg: 'rgba(5,150,105,0.1)',
      desc: 'Đang hoạt động',
      onClick: () => navigate('/teachers'),
    },
    {
      title: 'Hệ Thống', icon: 'fa-server',
      value: '●', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',
      desc: 'Đang hoạt động bình thường',
      onClick: null,
    },
  ];

  const quickActions = [
    { label: 'Quản Lý Sinh Viên', icon: 'fa-user-graduate', color: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)', path: '/students', desc: 'Xem & quản lý hồ sơ sinh viên' },
    { label: 'Quản Lý Giảng Viên', icon: 'fa-chalkboard-user', color: '#059669', gradient: 'linear-gradient(135deg, #059669, #047857)', path: '/teachers', desc: 'Quản lý thông tin giảng viên' },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="animate-in">
      {/* Welcome Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #7c3aed 100%)',
        borderRadius: '16px', padding: '28px 32px', marginBottom: '20px',
        color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(37,99,235,0.3)',
      }}>
        {/* Orbs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: '50%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '20px', padding: '4px 12px', marginBottom: '12px',
            fontSize: '11.5px', fontWeight: 600, color: 'rgba(255,255,255,0.75)',
          }}>
            <i className="fa-solid fa-shield-halved" style={{ color: '#60a5fa', fontSize: '11px' }} />
            Hệ thống Quản lý Đào Tạo
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            {greeting()}, {adminUser?.name || 'Admin'} 👋
          </h2>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', lineHeight: 1.5 }}>
            Quản lý toàn bộ sinh viên, giảng viên và hoạt động đào tạo — tất cả trong một nền tảng.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-cards">
        {statCards.map((s, i) => (
          <div
            key={i} className="stat-card animate-in"
            style={{ cursor: s.onClick ? 'pointer' : 'default', animationDelay: `${i * 60}ms` }}
            onClick={s.onClick}
          >
            <div className="stat-header">
              <span className="stat-title">{s.title}</span>
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                <i className={`fa-solid ${s.icon}`} />
              </div>
            </div>
            {loading && s.value === null ? (
              <div className="skeleton" style={{ height: 36, width: 80, borderRadius: 8, margin: '4px 0' }} />
            ) : (
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            )}
            <div className="stat-desc">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-panel">
        <div className="panel-header">
          <h3>
            <i className="fa-solid fa-bolt" />
            Thao Tác Nhanh
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => navigate(action.path)}
              style={{
                background: action.gradient,
                border: 'none', borderRadius: '12px',
                padding: '20px', cursor: 'pointer',
                color: '#fff', textAlign: 'left',
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative', overflow: 'hidden',
                boxShadow: `0 4px 16px ${action.color}30`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${action.color}40`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 16px ${action.color}30`; }}
            >
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
              <i className={`fa-solid ${action.icon}`} style={{ fontSize: '26px', marginBottom: '10px', display: 'block', opacity: 0.9 }} />
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{action.label}</div>
              <div style={{ fontSize: '12px', opacity: 0.75 }}>{action.desc}</div>
              <div style={{ marginTop: '12px', fontSize: '11.5px', fontWeight: 600, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Truy cập ngay <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px' }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(124,58,237,0.04))', borderColor: 'rgba(37,99,235,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '18px' }}>
            <i className="fa-solid fa-circle-info" />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
              Cổng Quản Trị — Admin Portal
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Hệ thống Quản lý Đào Tạo dành cho Phòng Đào Tạo · v1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
