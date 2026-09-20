import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initClickTracker } from './services/tracker'

// Khởi chạy theo dõi sự kiện click trên giao diện Admin
initClickTracker('admin')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

