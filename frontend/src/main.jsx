import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  // เช็คว่าเป็นการยิงไปที่ /api และไม่ใช่ /api/login
  if (typeof url === 'string' && (url.startsWith('/api') || url.startsWith('http://localhost:5000/api'))) {
    if (!url.includes('/login')) {
      const token = localStorage.getItem('token');
      if (token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }
  }

  const response = await originalFetch(url, options);

  // ดักจับกรณี Token หมดอายุหรือไม่ถูกต้อง
  if (response.status === 401 && !url.includes('/login')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    window.location.href = '/'; // เด้งกลับไปหน้าล็อกอิน
  }

  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
