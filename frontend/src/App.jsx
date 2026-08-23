import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom' 

import ProtectedRoute from './components/ProtectedRoute' 
import Dashboard from './pages/Dashboard' 
import Add_new_products from './pages/Add_new_products' 
import Login from './pages/Login'
import AddUser from './pages/AddUser'
import ManageUsers from './pages/ManageUsers'
import ProfilePage from './pages/ProfilePage'
import ManageProducts from './pages/ManageProducts'
import ManageStockIn from './pages/ManageStockIn'
import AddStockIn from './pages/AddStockIn'
import SellProduct from './pages/SellProduct'
import SalesReport from './pages/SalesReport'
import ManageSales from './pages/ManageSales'
import Inventory from './pages/Inventory'
import ProductHistory from './pages/ProductHistory'

function App() {
  return (
    <Router>
      <Routes>
        {/* 🆓 โซนสาธารณะ: หน้า Login เป็นหน้าแรกสุด (ยังไม่ล็อกอินก็เห็นหน้านี้) */}
        <Route path="/" element={<Login />} />

        {/* 🟢 โซนที่ 1: "พนักงานทุกคน" และ "แอดมิน" เข้าได้ (แค่เช็คว่าล็อกอินหรือยัง) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ManageProducts" element={<ManageProducts />} />
          <Route path="/ManageStockIn" element={<ManageStockIn />} />
          <Route path="/add-stock-in" element={<AddStockIn />} />
          <Route path="/SellProduct" element={<SellProduct />} />
          <Route path="/SalesReport" element={<SalesReport />} />
          <Route path="/ManageSales" element={<ManageSales />} />
          <Route path="/Inventory" element={<Inventory />} />

        </Route>

        {/* 🔴 โซนที่ 2: "เฉพาะแอดมิน" เท่านั้นที่เข้าได้ (พนักงานแอบเข้าจะโดนดีดออก) */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route path="/add-user" element={<AddUser />} />
          <Route path="/Manage-user" element={<ManageUsers />} />
          <Route path="/add-product" element={<Add_new_products />} />
          <Route path="/product-history" element={<ProductHistory />} />

        </Route>
        
      </Routes>
    </Router>
  )
}

export default App