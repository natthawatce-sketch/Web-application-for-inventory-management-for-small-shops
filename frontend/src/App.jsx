import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom' 

// 🛡️ 1. นำเข้าไฟล์ป้อมยาม (ตรวจเช็คโฟลเดอร์ให้ตรงด้วยนะครับ)
import ProtectedRoute from './components/ProtectedRoute' 

import Dashboard from './pages/Dashboard' 
import Add_new_products from './pages/Add_new_products' 
import Edit_Product from './pages/Edit_Product'
import Login from './pages/Login'
import AddUser from './pages/AddUser'
import ManageUsers from './pages/ManageUsers'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <Router>
      <Routes>
        {/* 🆓 โซนสาธารณะ: หน้า Login เป็นหน้าแรกสุด (ยังไม่ล็อกอินก็เห็นหน้านี้) */}
        <Route path="/" element={<Login />} />

        {/* 🟢 โซนที่ 1: "พนักงานทุกคน" และ "แอดมิน" เข้าได้ (แค่เช็คว่าล็อกอินหรือยัง) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-product" element={<Add_new_products />} />
          <Route path="/Edit-Product" element={<Edit_Product />} />
          <Route path="/profile" element={<ProfilePage />} />
          
        </Route>

        {/* 🔴 โซนที่ 2: "เฉพาะแอดมิน" เท่านั้นที่เข้าได้ (พนักงานแอบเข้าจะโดนดีดออก) */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route path="/add-user" element={<AddUser />} />
          <Route path="/Manage-user" element={<ManageUsers />} />

        </Route>
        
      </Routes>
    </Router>
  )
}

export default App