import React, { useState, useEffect } from 'react';
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

import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(api.currentUser);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setAuthModalOpen(true);
    }
  }, []);

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
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} currentUser={currentUser} />

        <div className="main-wrapper">
          <Header
            activeTab={activeTab}
            currentUser={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
            onLogout={handleLogout}
          />

          <main className="content-body">
            {activeTab === 'dashboard' && <Dashboard currentUser={currentUser} />}
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
    </>
  );
}
