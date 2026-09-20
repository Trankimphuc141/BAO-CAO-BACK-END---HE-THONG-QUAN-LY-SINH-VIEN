import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthModal from './components/AuthModal';

import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import TimetablePage from './pages/TimetablePage';
import AttendancePage from './pages/AttendancePage';
import ExamPage from './pages/ExamPage';
import SurveyPage from './pages/SurveyPage';
import ThesisPage from './pages/ThesisPage';
import NotificationsPage from './pages/NotificationsPage';
import CurriculumPage from './pages/CurriculumPage';
import CourseRegistrationPage from './pages/CourseRegistrationPage';

import './App.css';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {
    // audio policy safety
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(api.currentUser);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [realtimeNotification, setRealtimeNotification] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!api.currentUser) return;
    try {
      const res = await api.getNotifications();
      if (res.success && res.data) {
        const count = res.data.filter(n => !n.isRead).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Error fetching notifications count:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
    }
  }, [currentUser, activeTab]); // Refresh when user changes or tab switches

  // Tự động đóng toast sau 6 giây
  useEffect(() => {
    if (!realtimeNotification) return;
    const timer = setTimeout(() => setRealtimeNotification(null), 6000);
    return () => clearTimeout(timer);
  }, [realtimeNotification]);

  useEffect(() => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    // Connect to backend websocket server
    const socketUrl = window.location.hostname === '127.0.0.1' 
      ? 'http://127.0.0.1:5000' 
      : 'http://localhost:5000';
    
    console.log('🔌 Connecting to WebSocket at', socketUrl);
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    const emitJoin = () => {
      const userId = currentUser.id || currentUser._id;
      socket.emit('join-room', { userId, role: 'student' });
      socket.emit('join', { userId, role: 'student' });
    };

    socket.on('connect', () => {
      console.log('🔌 [Student] Socket connected:', socket.id);
      emitJoin();
    });
    emitJoin();

    socket.on('new-notification', (notif) => {
      console.log('📣 WebSocket notification received:', notif);
      playNotificationSound();
      setRealtimeNotification(notif);
      fetchUnreadCount(); // Fetch count in real-time on message receipt
    });

    return () => {
      socket.off('new-notification');
      socket.disconnect();
    };
  }, [currentUser]);

  const handleTabChange = (tabId) => {
    if (!currentUser && tabId !== 'dashboard') {
      setAuthModalOpen(true);
      return;
    }
    setActiveTab(tabId);
  };

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng Sinh Viên?')) {
      api.clearToken();
      setCurrentUser(null);
      setAuthModalOpen(true);
    }
  };

  const handleAvatarUpdated = (newAvatar) => {
    setCurrentUser((prev) => (prev ? { ...prev, avatar: newAvatar } : prev));
  };

  return (
    <>
      <div className="bg-glow-orb orb-1"></div>
      <div className="bg-glow-orb orb-2"></div>

      <div id="app-container">
        {currentUser && (
          <>
            <Sidebar activeTab={activeTab} onTabChange={handleTabChange} currentUser={currentUser} unreadCount={unreadCount} />

            <div className="main-wrapper">
          <Header
            activeTab={activeTab}
            currentUser={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
            onLogout={handleLogout}
          />

          <main className="content-body">
            {activeTab === 'dashboard' && <Dashboard currentUser={currentUser} />}
            {activeTab === 'notifications' && <NotificationsPage />}
            {activeTab === 'portal' && (
              <ProfilePage currentUser={currentUser} onAvatarUpdated={handleAvatarUpdated} />
            )}
            {activeTab === 'timetable' && <TimetablePage currentUser={currentUser} />}
            {activeTab === 'attendance' && <AttendancePage currentUser={currentUser} />}
            {activeTab === 'exams' && <ExamPage currentUser={currentUser} />}
            {activeTab === 'survey' && <SurveyPage currentUser={currentUser} />}
            {activeTab === 'thesis' && (
              <ThesisPage currentUser={currentUser} onOpenAuth={() => setAuthModalOpen(true)} />
            )}
            {activeTab === 'curriculum' && <CurriculumPage currentUser={currentUser} />}
            {activeTab === 'registration' && <CourseRegistrationPage currentUser={currentUser} />}
          </main>
        </div>
          </>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen || !currentUser}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveTab('dashboard');
        }}
      />

      {realtimeNotification && (
        <div
          onClick={() => {
            if (
              realtimeNotification.link === '/profile' ||
              realtimeNotification.title?.toLowerCase().includes('phúc khảo') ||
              realtimeNotification.content?.toLowerCase().includes('phúc khảo')
            ) {
              setActiveTab('portal');
            } else {
              setActiveTab('notifications');
            }
            setRealtimeNotification(null);
          }}
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            minWidth: '330px',
            maxWidth: '400px',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(99, 102, 241, 0.5)',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(129, 140, 248, 0.3)',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            color: '#fff',
            cursor: 'pointer',
            animation: 'slideInRightStudent 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <style>{`
            @keyframes slideInRightStudent {
              from { transform: translateX(120%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              border: '1.5px solid rgba(129, 140, 248, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              flexShrink: 0,
              fontSize: '18px',
            }}
          >
            <i className="fa-solid fa-bell"></i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#818cf8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                🔔 Thông Báo Mới
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRealtimeNotification(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px 4px',
                  lineHeight: 1,
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#ffffff', marginBottom: '4px', lineHeight: 1.3 }}>
              {realtimeNotification.title}
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
              {realtimeNotification.content}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(99, 102, 241, 0.35)',
                  color: '#c7d2fe',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(129, 140, 248, 0.3)',
                }}
              >
                Xem chi tiết →
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
