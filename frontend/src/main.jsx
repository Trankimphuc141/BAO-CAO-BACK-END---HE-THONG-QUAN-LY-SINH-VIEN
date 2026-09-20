import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initClickTracker } from './services/tracker';

// Khởi chạy theo dõi sự kiện click trên giao diện Sinh viên
initClickTracker('student');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

