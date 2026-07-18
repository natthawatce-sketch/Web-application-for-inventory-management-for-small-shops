import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Dashboard = () => {
  const navigate = useNavigate();

  // ==========================================
  // 📦 States สำหรับระบบแจ้งเตือนสินค้าใกล้หมดอายุ
  // ==========================================
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [expiryItems, setExpiryItems] = useState([]); // ดึงข้อมูลจริงจาก API
  
  const hasAlerts = expiryItems.length > 0;

  // ==========================================
  // 🔐 ระบบรักษาความปลอดภัย และดึงข้อมูลจริง
  // ==========================================
  useEffect(() => {
    const user = localStorage.getItem('user_name');
    if (!user) {
      navigate('/');
    } else {
      // เรียกใช้ฟังก์ชันเมื่อล็อกอินผ่าน
      fetchExpiryAlerts();
    }
  }, [navigate]);

  // 🔍 ฟังก์ชันดึงข้อมูลจากหลังบ้าน
  const fetchExpiryAlerts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/alerts/expiring');
      if (response.ok) {
        const data = await response.json();
        setExpiryItems(data);
      }
    } catch (error) {
      console.error("Error fetching expiry alerts:", error);
    }
  };

  // ==========================================
  // 🗑️ ฟังก์ชันจัดการตัดสต็อกสินค้าที่หมดอายุ
  // ==========================================
  const handleDiscardItem = async (alertId, productId, quantity, barcode) => {
    const toastId = toast.loading('กำลังตัดสต็อกและบันทึกข้อมูล...');
    const userId = localStorage.getItem('user_id') || 1;

    try {
      const response = await fetch('http://localhost:5000/api/inventory/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          alert_id: alertId, 
          product_id: productId, 
          quantity: quantity,
          barcode: barcode,
          user_id: userId
        })
      });

      if (response.ok) {
        toast.success('ทิ้งสินค้าและตัดสต็อกเรียบร้อยแล้ว!', { id: toastId });
        // อัปเดตข้อมูลบนหน้าจอโดยเอาตัวที่ลบออก
        const updatedItems = expiryItems.filter(item => item.alert_id !== alertId);
        setExpiryItems(updatedItems);
      } else {
        toast.error('ไม่สามารถตัดสต็อกได้', { id: toastId });
      }
    } catch (error) {
      console.error("Discard error:", error);
      toast.error('ระบบหลังบ้านมีปัญหา', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Toaster position="top-right" />
      <Navbar />

      {/* --- พื้นที่ตรงกลาง (Main Content) --- */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* 🌟 กล่องเมนู 2 ปุ่มหลัก */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* 🔴 ปุ่มที่ 1: แจ้งเตือนสินค้าใกล้หมดอายุ */}
          <button 
            onClick={() => setIsExpiryModalOpen(true)} // กดได้เสมอ ไม่ว่าจะมีการแจ้งเตือนหรือไม่
            className="relative bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-red-300 transition-all flex items-start gap-4 text-left group overflow-hidden"
          >
            {/* พื้นหลังตกแต่งมุมขวาบน */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>

            {/* 🔴 จุดแดงแจ้งเตือนมุมขวาบน (โชว์เฉพาะเวลามีของใกล้หมด/หมดอายุ) */}
            {hasAlerts && (
              <span className="absolute top-4 right-4 flex h-4 w-4 sm:h-5 sm:w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 sm:h-5 sm:w-5 bg-red-500 border-2 border-white shadow-sm"></span>
              </span>
            )}

            {/* ไอคอนกระดิ่ง */}
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 transition-colors ${hasAlerts ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400 group-hover:text-red-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 sm:w-7 sm:h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
              </svg>
            </div>
            
            {/* รายละเอียดข้อความ */}
            <div>
              <h3 className={`text-base sm:text-lg font-bold transition-colors ${hasAlerts ? 'text-slate-800 group-hover:text-red-600' : 'text-slate-600 group-hover:text-slate-800'}`}>แจ้งเตือนวันหมดอายุ</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">ตรวจสอบสินค้าที่ใกล้ถึงกำหนด</p>
              
              {/* สลับการแสดงข้อความด้านล่างตามสถานะว่ามีข้อมูลไหม */}
              {hasAlerts ? (
                <p className="text-xs font-bold text-red-600 mt-2 bg-red-50 border border-red-100 inline-flex items-center gap-1 px-2.5 py-1 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                  พบ {expiryItems.length} รายการที่ต้องจัดการ
                </p>
              ) : (
                <p className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ไม่มีรายการแจ้งเตือน
                </p>
              )}
            </div>
          </button>

          {/* 📦 ปุ่มที่ 2: เช็คจำนวนสินค้าในคลัง */}
          <button 
            onClick={() => navigate('/Inventory')}
            className="relative bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex items-start gap-4 text-left group overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 sm:w-7 sm:h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">จำนวนสินค้าในคลัง</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">เช็คยอดคงเหลือ <br /> สถานะพร้อมขาย และใกล้หมดสต็อก</p>
            </div>
          </button>

        </div>
      </main>

      <Footer/>

      {/* ========================================================= */}
      {/* 🚨 Modal ป๊อปอัปแจ้งเตือนสินค้าหมดอายุ */}
      {/* ========================================================= */}
      {isExpiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <h2 className="text-lg font-bold text-slate-800">รายการสินค้าใกล้หมดอายุ</h2>
              </div>
              <button onClick={() => setIsExpiryModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body (List) */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50/50 space-y-3">
              
              {/* 🟩 กรณีไม่มีสินค้าแจ้งเตือน ให้โชว์ข้อความสีเทา */}
              {!hasAlerts ? (
                <div className="text-center py-12 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-slate-500 font-medium">ไม่มีรายการที่ใกล้หมดอายุหรือหมดอายุ</p>
                </div>
              ) : (
                /* 🟧/🟥 กรณีมีสินค้าให้โชว์เป็นลิสต์ */
                expiryItems.map((item) => (
                  <div 
                    key={item.alert_id} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border-l-4 shadow-sm bg-white ${
                      item.status === 'expired' 
                        ? 'border-red-500 border ' // สีแดง (สำหรับของที่หมดอายุแล้ว)
                        : 'border-orange-400 border ' // สีส้ม (ใกล้หมด)
                    }`}
                  >
                    {/* ข้อมูลสินค้า */}
                    <div className="flex-1 mb-3 sm:mb-0 ">
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base">{item.product_name}</h4>
                      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mt-1 text-xs sm:text-sm">
                        <span className="text-slate-500 font-mono flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /></svg>
                          {item.barcode}
                        </span>
                        <span className="text-slate-500">จำนวน: <strong className="text-slate-800">{item.quantity}</strong> {item.unit}</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          item.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          หมดอายุ: {new Date(item.expiration_date).toLocaleDateString('th-TH', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* ปุ่มจัดการ */}
                    <div className="shrink-0 flex items-center justify-end sm:pl-2 sm:pt-6 lg:pl-2 lg:pt-6 ">
                      {item.status === 'expired' ? (
                        <button 
                          onClick={() => handleDiscardItem(item.alert_id, item.product_id, item.quantity, item.barcode)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          ตัดสต็อกทิ้ง
                        </button>
                      ) : (
                        <span className="text-orange-500 text-xs sm:text-sm font-bold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 text-center flex items-center gap-1">
                           เหลืออีก {item.days_left} วัน
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;