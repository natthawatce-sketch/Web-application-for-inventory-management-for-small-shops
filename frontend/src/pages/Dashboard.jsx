import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 🛠️ เช็คความปลอดภัย: ถ้าไม่มีข้อมูลผู้ใช้ใน localStorage ให้เด้งกลับหน้า Login ทันที
    const user = localStorage.getItem('user_name');
    if (!user) {
      navigate('/'); // เปลี่ยนไปยังหน้า Login
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar />
      
     
    </div>
  );
};

export default Dashboard;