import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Component ป้อมยาม
const ProtectedRoute = ({ requireAdmin }) => {
  const username = localStorage.getItem('user_name');
  const role = localStorage.getItem('user_role');

  // ด่านที่ 1: เช็คว่าล็อกอินหรือยัง?
  if (!username) {
    // ถ้ายัง ให้เด้งกลับไปหน้าล็อกอิน
    return <Navigate to="/" replace />; 
  }

  // ด่านที่ 2: หน้าเว็บนี้ต้องการสิทธิ์ "แอดมิน" หรือไม่?
  if (requireAdmin && role !== 'admin') {
    // ถ้าต้องการแอดมิน แต่คนเข้าเป็นพนักงาน ให้เด้งไป Dashboard
    return <Navigate to="/dashboard" replace />; 
  }

  // ถ้าผ่านทุกด่าน อนุญาตให้แสดงผลหน้าเว็บนั้นๆ ได้ (<Outlet /> คือหน้าเว็บต่างๆ ที่ถูกครอบอยู่)
  return <Outlet />;
};

export default ProtectedRoute;