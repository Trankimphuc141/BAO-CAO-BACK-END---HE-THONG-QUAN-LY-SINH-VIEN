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

import './App.css';

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

  useEffect(() => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    // Connect to backend websocket server
    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : 'http://localhost:5000';
    
    console.log('🔌 Connecting to WebSocket at', socketUrl);
    const socket = io(socketUrl);

    socket.emit('join-room', { userId: currentUser.id });

    socket.on('new-notification', (notif) => {
      console.log('📣 WebSocket notification received:', notif);
      setRealtimeNotification(notif);
      fetchUnreadCount(); // Fetch count in real-time on message receipt
    });

    return () => {
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
          </main>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveTab('dashboard');
        }}
      />

      {realtimeNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(79, 70, 229, 0.4)',
          borderRadius: '12px',
          padding: '16px',
          width: '320px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🔔 Thông báo realtime
            </span>
            <button 
              onClick={() => setRealtimeNotification(null)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px' }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <strong style={{ fontSize: '13.5px' }}>{realtimeNotification.title}</strong>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.4 }}>{realtimeNotification.content}</p>
        </div>
      )}
    </>
  );
}
