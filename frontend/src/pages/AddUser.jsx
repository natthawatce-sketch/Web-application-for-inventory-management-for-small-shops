import React, { useState, useEffect } from 'react';

const AddUser = () => {
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff'); 
  const [status, setStatus] = useState('active'); 

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // 🚨 State สำหรับเก็บว่าช่องไหนบ้างที่ยังไม่ได้กรอก
  const [emptyFields, setEmptyFields] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // เคลียร์ค่าแจ้งเตือนเก่า
    setSuccessMessage('');
    setErrorMessage('');
    setEmptyFields([]);

    // 🔍 ตรวจสอบข้อมูลว่ากรอกครบหรือไม่
    const missingFields = [];
    if (!username.trim()) missingFields.push('username');
    if (!email.trim()) missingFields.push('email');
    if (!password.trim()) missingFields.push('password');

    // ถ้ามีช่องว่าง ให้แจ้งเตือนสีแดงที่ช่องนั้น
    if (missingFields.length > 0) {
      setEmptyFields(missingFields);
      setErrorMessage('กรุณากรอกข้อมูลในช่องที่ไฮไลท์สีแดงให้ครบถ้วน');
      return;
    }

    if (password.length < 6) {
      setEmptyFields(['password']);
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, role, status }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('เพิ่มผู้ใช้งานสำเร็จเรียบร้อยแล้ว!');
        setUsername('');
        setEmail('');
        setPassword('');
        setRole('staff');
        setStatus('active');
        setEmptyFields([]);
      } else {
        setErrorMessage(data.message || 'เกิดข้อผิดพลาด ไม่สามารถเพิ่มผู้ใช้งานได้');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setErrorMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านได้');
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 ฟังก์ชันช่วยกำหนดสีของกรอบ Input (ถ้าลืมกรอกให้เป็นสีแดง)
  const getInputClasses = (fieldName) => {
    const baseClass = "w-full border-2 rounded-xl p-2.5 pl-11 text-sm outline-none transition-colors ";
    if (emptyFields.includes(fieldName)) {
      return baseClass + "border-red-400 bg-red-50 focus:border-red-500 text-red-800 placeholder-red-300";
    }
    return baseClass + "border-gray-200 bg-gray-50/50 focus:border-blue-500 text-gray-800 focus:bg-white";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden xl:mt-4">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-white flex items-center gap-4 xl:p-6">
          <div className="bg-white/20 p-3 rounded-full">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">เพิ่มผู้ใช้งานระบบ</h1>
            <p className="text-xs text-blue-100 mt-1 opacity-90">สร้างบัญชีผู้ใช้ใหม่สำหรับพนักงานหรือผู้ดูแลร้าน</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          {/* แจ้งเตือนข้อผิดพลาดรวม */}
          {errorMessage && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium animate-pulse">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errorMessage}
            </div>
          )}

          {/* แจ้งเตือนสำเร็จ */}
          {successMessage && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* 1. ชื่อผู้ใช้งาน */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ชื่อผู้ใช้งาน (Username) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-5 h-5 ${emptyFields.includes('username') ? 'text-red-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ตัวอย่าง: somchai_staff"
                className={getInputClasses('username')}
              />
            </div>
            {emptyFields.includes('username') && <p className="text-red-500 text-xs mt-1.5 ml-1">กรุณาระบุชื่อผู้ใช้งาน</p>}
          </div>

          {/* 2. อีเมล */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              อีเมล (Email) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-5 h-5 ${emptyFields.includes('email') ? 'text-red-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="somchai@example.com"
                className={getInputClasses('email')}
              />
            </div>
            {emptyFields.includes('email') && <p className="text-red-500 text-xs mt-1.5 ml-1">กรุณาระบุอีเมลที่ติดต่อได้</p>}
          </div>

          {/* 3. รหัสผ่าน */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              รหัสผ่าน (Password) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className={`w-5 h-5 ${emptyFields.includes('password') ? 'text-red-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={getInputClasses('password')}
              />
            </div>
            {emptyFields.includes('password') && <p className="text-red-500 text-xs mt-1.5 ml-1">กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร</p>}
          </div>

          {/* แถวสิทธิ์และสถานะ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">สิทธิ์การใช้งาน</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border-2 border-gray-200 bg-gray-50/50 focus:bg-white rounded-xl p-2.5 pl-11 text-sm outline-none focus:border-blue-500 text-gray-800 cursor-pointer appearance-none"
                >
                  <option value="staff">พนักงานทั่วไป (Staff)</option>
                  <option value="admin">เจ้าของร้าน (Admin)</option>
                </select>
                {/* Custom Dropdown Arrow */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">สถานะบัญชี</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4C5.5 8.5 3 10.5 3 14c0 3.866 3.582 7 8 7s8-3.134 8-7c0-3.5-2.5-5.5-6-6M9 12v6" />
                  </svg>
                </div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border-2 border-gray-200 bg-gray-50/50 focus:bg-white rounded-xl p-2.5 pl-11 text-sm outline-none focus:border-blue-500 text-gray-800 cursor-pointer appearance-none"
                >
                  <option value="active">ใช้งานปกติ (Active)</option>
                  <option value="inactive">ระงับการใช้งาน (Inactive)</option>
                </select>
                {/* Custom Dropdown Arrow */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-6" />

         {/* ปุ่มควบคุม */}
          <div className="flex justify-between items-center  mt-2">
            
            {/* ⬅️ ปุ่มกลับไปหน้า Dashboard (อยู่ฝั่งซ้าย) */}
            <button
              type="button"
              onClick={() => window.location.href = '/dashboard'} // ถ้าในไฟล์มีการใช้ useNavigate() สามารถเปลี่ยนเป็น navigate('/dashboard') ได้ครับ
              className="border-2 border-gray-200 py-2.5  px-2 text-gray-500 rounded-xl text-xs font-semibold hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center gap-2 xl:text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              กลับหน้าหลัก
            </button>

            {/* ➡️ กลุ่มปุ่มควบคุมฟอร์ม (อยู่ฝั่งขวา) */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername(''); setEmail(''); setPassword('');
                  setRole('staff'); setStatus('active');
                  setErrorMessage(''); setSuccessMessage(''); setEmptyFields([]);
                }}
                className=" px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-100 hover:text-gray-800 transition-colors xl:text-sm"
              >
                ล้างค่า
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-2  text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1 xl:text-sm ${
                  isLoading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    บันทึกข้อมูล
                  </>
                )}
              </button>
            </div>
            
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddUser;