import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const navigate = useNavigate(); // 👈 2. ประกาศใช้งาน navigate

  useEffect(() => {
    const username = localStorage.getItem('user_name'); 
    if (!username) {
      navigate('/', { replace: true }); // ดีดกลับหน้า Login ทันที
    }
  }, [navigate]);
  
  
  const fileInputRef = useRef(null);
  const userId = localStorage.getItem('user_id'); // ดึงรหัสไอดีผู้ใช้จากเบราว์เซอร์

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [role, setRole] = useState('');
  const [imagePreview, setImagePreview] = useState('https://via.placeholder.com/150');
  const [selectedFile, setSelectedFile] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // 🔄 วิ่งไปโหลดข้อมูลจริงจากฐานข้อมูลหลังบ้านเมื่อเปิดหน้านี้ขึ้นมา
  useEffect(() => {
    const loadProfileData = async () => {
      if (!userId) {
        setAlert({ show: true, type: 'error', message: 'ไม่พบรหัสผู้ใช้ กรุณาล็อกอินใหม่อีกครั้ง' });
        return;
      }
      try {
        const response = await fetch(`/api/users/profile/${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          setRole(data.role);
          setFormData((prev) => ({
            ...prev,
            username: data.username,
            email: data.email || '',
          }));
          
          // เช็คว่ามีรูปโปรไฟล์ในฐานข้อมูลไหม ถ้ามีให้แสดงรูปจากเซิร์ฟเวอร์หลังบ้าน
          if (data.profile_image) {
            setImagePreview((data.profile_image?.startsWith('http') ? data.profile_image : `/uploads/${data.profile_image}`));
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfileData();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (alert.show) setAlert({ show: false, type: '', message: '' });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setAlert({ show: true, type: 'error', message: 'รูปใหญ่เกินไป! (ไม่เกิน 2MB)' });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🛑 ดักจับกรณี "กรอกรหัสผ่านไม่ครบ" (เช็คว่ามีการพิมพ์ช่องใดช่องหนึ่งไหม)
    const isChangingPassword = formData.currentPassword || formData.newPassword || formData.confirmPassword;

    if (isChangingPassword) {
      if (!formData.currentPassword) {
        setAlert({ show: true, type: 'error', message: '⚠️ กรุณากรอก "รหัสผ่านปัจจุบัน" เพื่อยืนยัน' });
        return;
      }
      if (!formData.newPassword) {
        setAlert({ show: true, type: 'error', message: '⚠️ กรุณากรอก "รหัสผ่านใหม่" ที่ต้องการเปลี่ยน' });
        return;
      }
      if (formData.newPassword.length < 6) {
        setAlert({ show: true, type: 'error', message: '⚠️ รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setAlert({ show: true, type: 'error', message: '⚠️ รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน!' });
        return;
      }
    }

    try {
      // 📦 แพ็คข้อมูลแบบ FormData เพื่อส่งไฟล์รูปภาพ
      const dataToSend = new FormData();
      dataToSend.append('username', formData.username);
      dataToSend.append('email', formData.email);
      dataToSend.append('role', role);
      dataToSend.append('status', 'active');
      
      // ส่งรหัสผ่านไปให้หลังบ้านเช็ค
      if (formData.currentPassword) {
        dataToSend.append('currentPassword', formData.currentPassword);
      }
      if (formData.newPassword) {
        dataToSend.append('password', formData.newPassword);
      }
      if (selectedFile) {
        dataToSend.append('profile_image', selectedFile); 
      }

      // 🚀 ยิงคำสั่งอัปเดตไปที่พอร์ตหลังบ้าน
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: dataToSend, 
      });

      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem('user_name', formData.username);
        if (result.profile_image) {
          localStorage.setItem('profile_image', result.profile_image);
        }

        setAlert({ show: true, type: 'success', message: 'บันทึกข้อมูลและรูปโปรไฟล์สำเร็จ!' });
        setFormData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));

        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } else {
        // โชว์ Error สีแดงตรงๆ จากที่หลังบ้านส่งมาให้เลย
        setAlert({ show: true, type: 'error', message: `❌ ${result.message || 'เกิดข้อผิดพลาด'}` });
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', message: '❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-2 sm:p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden max-h-[95vh] sm:max-h-[95vh]">
        
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 text-white shrink-0">
          <h1 className="text-lg font-bold tracking-wide">จัดการข้อมูลส่วนตัว</h1>
          <p className="text-blue-100 text-[10px] mt-0.5">ระบบดึงและอัปเดตข้อมูลจากฐานข้อมูลโดยตรง</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {alert.show && (
            <div className={`p-2.5 rounded-lg flex items-center gap-2 border text-xs transition-all duration-300 ${
              alert.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              <span>{alert.type === 'error' ? '🚨' : '✅'}</span>
              <p className="font-medium">{alert.message}</p>
            </div>
          )}

          {/* 📸 ส่วนรูปโปรไฟล์ */}
          <div className="flex flex-col items-center justify-center py-1">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-[3px] border-white shadow-md bg-slate-200">
                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="absolute bottom-0 right-0 bg-blue-200 text-white p-1 rounded-full shadow-md text-xs"
              >
                📷
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>

          {/* ข้อมูลทั่วไป */}
          <div>
            <h2 className="text-[11px] font-bold uppercase text-slate-400 mb-2 pb-1 border-b">ข้อมูลทั่วไป</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อผู้ใช้งาน</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">อีเมลพนักงาน</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">ระดับสิทธิ์บัญชี</label>
                <input
                  type="text"
                  value={role?.toLowerCase() === 'admin' ? 'เจ้าของร้าน (Admin)' : 'พนักงานทั่วไป (Staff)'}
                  className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* เปลี่ยนรหัสผ่าน */}
          <div>
            <h2 className="text-[11px] font-bold uppercase text-slate-400 mb-2 pb-1 border-b">ความปลอดภัย</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="6 ตัวขึ้นไป"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ยืนยันรหัสใหม่</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="พิมพ์อีกครั้ง"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-medium"
              onClick={() => window.location.href = '/dashboard'} 
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium shadow-md"
            >
              บันทึกข้อมูล
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ProfilePage;