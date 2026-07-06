import React, { useState, useEffect, useRef } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 💡 State สำหรับเก็บข้อมูลผู้ใช้
  const [username, setUsername] = useState('ProjectPOti'); 
  const [userRole, setUserRole] = useState('admin'); 
  const [profileImage, setProfileImage] = useState(null);
  
  // 🔔 State สำหรับเปิด/ปิด แจ้งเตือนเข้าสู่ระบบสำเร็จ
  const [showAlert, setShowAlert] = useState(false);

  // 1. ปิดเมนูดรอปดาวน์เมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ⚙️ 2. ดึงข้อมูลจาก LocalStorage มาอัปเดต State หน้าเว็บ
  useEffect(() => {
    const storedName = localStorage.getItem('user_name');
    const storedRole = localStorage.getItem('user_role');
    const storedImage = localStorage.getItem('profile_image');
    
    if (storedName) setUsername(storedName);
    if (storedRole) setUserRole(storedRole);
    if (storedImage) setProfileImage(storedImage);
  }, []); 

  // 🚀 3. เช็คว่าเพิ่งล็อกอินเข้ามาหรือเปล่า เพื่อโชว์แจ้งเตือน
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem('just_logged_in');
    
    if (justLoggedIn === 'true') {
      setShowAlert(true); // เปิดกล่องแจ้งเตือน
      sessionStorage.removeItem('just_logged_in'); // ลบค่าทิ้ง จะได้ไม่เด้งซ้ำเวลากดรีเฟรชหน้าเว็บ
      
      // ตั้งเวลาให้กล่องแจ้งเตือนหายไปเองใน 3 วินาที (3000 มิลลิวินาที)
      setTimeout(() => {
        setShowAlert(false);
      }, 3000);
    }
  }, []);

  return (
    <div className="w-full bg-blue-900 shadow-sm border-b border-blue-900/5 flex items-center justify-between px-6 py-3 relative">
      
      {/* 🟢 กล่องแจ้งเตือนเข้าสู่ระบบสำเร็จ (ป๊อปอัปตรงกลางบน) */}
      {showAlert && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-[100] border-l-4 border-green-700 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-bold text-sm">เข้าสู่ระบบสำเร็จ!</p>
            <p className="text-xs text-green-100">ยินดีต้อนรับคุณ {username}</p>
          </div>
        </div>
      )}

      {/* ฝั่งซ้าย: ข้อความหัวข้อหน้าเว็บ */}
      <div className="text-xl font-bold text-white">
        ระบบจัดการคลังสินค้า
      </div>

      {/* ฝั่งขวา: โค้ด Dropdown โปรไฟล์และ Role */}
      <div className="relative inline-block text-left" ref={dropdownRef}>
        
        {/* --- ปุ่มรูปโปรไฟล์ --- */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="border border-blue-700 flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-blue-800/80 focus:outline-none transition-colors text-white text-right"
        >
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-semibold">{username}</p>
            <p className="text-xs text-blue-200 font-medium">
              {userRole?.toLowerCase() === 'admin' || username?.toLowerCase().includes('admin') 
                ? 'เจ้าของร้าน (แอดมิน)' 
                : 'พนักงาน'}
            </p>
          </div>

          <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white/50 overflow-hidden flex items-center justify-center">
            <img
              src={profileImage 
                ? `http://${window.location.hostname}:5000/uploads/${profileImage}` 
                : `https://ui-avatars.com/api/?name=${username || 'User'}&background=eff6ff&color=1d4ed8&size=100`
              } 
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </button>

        {/* --- กล่องเมนูดรอปดาวน์ --- */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-3">
            
            <div className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors mb-2">
              <img 
                src={profileImage 
                  ? `http://${window.location.hostname}:5000/uploads/${profileImage}` 
                  : `https://ui-avatars.com/api/?name=${username || 'User'}&background=eff6ff&color=1d4ed8&size=100`
                } 
                alt="Profile" 
                className="w-10 h-10 rounded-full mr-3 object-cover" 
              />
              <div>
                <p className="font-semibold text-gray-800">{username}</p>
                <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mt-1 ${
                  userRole?.toLowerCase() === 'admin' || username?.toLowerCase().includes('admin')
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {userRole?.toLowerCase() === 'admin' || username?.toLowerCase().includes('admin')
                    ? 'เจ้าของร้าน (แอดมิน)' 
                    : 'พนักงานทั่วไป'}
                </span>
              </div>
            </div>

            <hr className="border-gray-200 my-2" />

            <ul className="space-y-1 text-gray-700 text-sm">
              {(userRole?.toLowerCase() === 'admin' || username?.toLowerCase().includes('admin')) ? (
                <>
                  <li>
                    <button 
                      onClick={() => window.location.href = '/add-user'} 
                      className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                        </svg>
                      </span>
                      <span className="font-medium">เพิ่มผู้ใช้งาน</span>
                    </button>
                  </li>
                  <li>
                    <button 
                    onClick={() => window.location.href = '/Manage-user'} 
                    className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </span>
                      <span className="font-medium">แก้ไขข้อมูล / รหัสผ่านพนักงาน</span>
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <button 
                    onClick={() => window.location.href = '/profile'} 
                    className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      </span>
                      <span className="font-medium">แก้ไขข้อมูลส่วนตัว</span>
                    </button>
                  </li>
                </>
              )}

              <hr className="border-gray-200 my-2" />

              <li>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = '/'; 
                  }}
                  className="w-full flex items-center p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                  </span>
                  <span className="font-medium">ออกจากระบบ</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;