import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/Logoremove.png'; // เช็ค path รูปโลโก้ให้ตรงกับโฟลเดอร์ของคุณนะครับ

const LoginPage = () => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // ⚠️ State สำหรับเก็บข้อความแจ้งเตือนเวลากรอกผิด

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 🔍 ตัวติดตามที่ 1: เช็คว่าปุ่มกดทำงานไหม
    console.log("1. กดปุ่มเข้าสู่ระบบแล้ว!");
    console.log("ข้อมูลที่เตรียมส่ง:", { username: loginInput, password });

    try {
      // 🔍 ตัวติดตามที่ 2: เช็คว่ากำลังเชื่อมต่อ Backend
      console.log("2. กำลังยิงไปที่ http://localhost:5000/api/login ...");

      const response = await fetch(`/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginInput, password }),
      });

      // 🔍 ตัวติดตามที่ 3: เช็คว่า Backend ยอมตอบกลับมาไหม
      console.log("3. Backend ตอบกลับมาแล้ว! สถานะ:", response.status);

      const data = await response.json();

      // 🛑 1. รับข้อความ Error (เช่น รหัสผิด หรือ บัญชีถูกระงับ) ที่ส่งมาจากหลังบ้าน
      if (!response.ok) {
        throw new Error(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      // 🛑 2. ดักจับเผื่อไว้ (ในกรณีที่หลังบ้านให้ผ่าน แต่ส่งสถานะ Inactive มา)
      if (data.status === 'inactive' || data.status === 'Inactive') {
        throw new Error('บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อแอดมิน');
      }

      console.log("4. ล็อกอินผ่าน! กำลังจะเปลี่ยนหน้า...");
      localStorage.setItem('token', data.token); // 🌟 บันทึก Token
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('user_name', data.username);
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('profile_image', data.profile_image || '');

      navigate('/dashboard');
      sessionStorage.setItem('just_logged_in', 'true');

    } catch (err) {
      // 🔍 ตัวติดตามที่ 4: เช็คว่า Error เข้ามาที่นี่ไหม
      console.log("🚨 เกิดข้อผิดพลาด:", err.message);

      if (err.message === 'Failed to fetch') {
        setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้ (เช็คว่าเปิด Node.js หรือยัง?)');
      } else {
        setErrorMessage(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center sm:px-6 lg:px-8">

      {/* Container หลัก */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <img className="h-40 w-auto" src={Logo} alt="Logo" />
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            ระบบจัดการคลังสินค้า
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            ลงชื่อเข้าใช้เพื่อจัดการสต็อกสินค้า
          </p>
        </div>
      </div>

      {/* กล่องฟอร์มล็อกอิน */}
      <div className="mt-1 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">

          {/* ⚠️ ป้ายเตือนสีแดง */}
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-400 p-4 rounded-md shadow-sm">
              <div className="flex items-center">
                <span className="text-red-500 mr-2 text-lg">❌</span>
                <p className="text-sm font-semibold text-red-600">{errorMessage}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Input - อีเมล/ชื่อผู้ใช้ */}
            <div>
              <label htmlFor="loginInput" className="block text-sm font-medium text-gray-700">
                อีเมล หรือ ชื่อผู้ใช้งาน
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  id="loginInput"
                  name="loginInput"
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150"
                  placeholder="เช่น admin_poti หรือ admin@company.com"
                />
              </div>
            </div>

            {/* Input - รหัสผ่าน */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                รหัสผ่าน
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-blue-600 focus:outline-none"
                >
                  {showPassword ? "ซ่อน" : "แสดง"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition duration-150"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  จดจำการใช้งาน
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 transform hover:scale-[1.01]"
              >
                เข้าสู่ระบบ
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">หรือ</span>
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600">
                หากพบปัญหาในการเข้าสู่ระบบ กรุณาติดต่อแอดมิน
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;