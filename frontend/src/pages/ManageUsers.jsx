import React, { useState, useEffect } from 'react';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // State สำหรับหน้าต่างแก้ไข
  const [isEditModalOpen, setIsOpenModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [status, setStatus] = useState('active');
  const [password, setPassword] = useState('');
  const [emptyFields, setEmptyFields] = useState([]);

  // 🗑️ State สำหรับหน้าต่างยืนยันการลบ
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/users`);
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      } else {
        showNotification('error', 'ไม่สามารถโหลดข้อมูลรายชื่อผู้ใช้งานได้');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (type, text) => {
    setGlobalMessage({ type, text });
    setTimeout(() => setGlobalMessage({ type: '', text: '' }), 4000);
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.user_id);
    setUsername(user.username);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status);
    setPassword(''); 
    setEmptyFields([]);
    setIsOpenModal(true); 
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setEmptyFields([]);

    const missingFields = [];
    if (!username.trim()) missingFields.push('username');
    if (!email.trim()) missingFields.push('email');

    if (missingFields.length > 0) {
      setEmptyFields(missingFields);
      return;
    }

    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username, email, role, status,
          ...(password.trim() && { password })
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', `อัปเดตข้อมูลของ ${username} สำเร็จแล้ว!`);
        setIsOpenModal(false);
        fetchUsers(); 
      } else {
        showNotification('error', data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    }
  };

  // 🗑️ ฟังก์ชันเตรียมลบ (เปิดหน้าต่างยืนยัน)
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // 🚨 ฟังก์ชันยืนยันการลบจริง (ยิง API ไปลบ)
  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/users/${userToDelete.user_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', `ลบบัญชี ${userToDelete.username} ออกจากระบบเรียบร้อยแล้ว`);
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
        fetchUsers(); // รีเฟรชตารางใหม่
      } else {
        showNotification('error', data.message || 'ไม่สามารถลบผู้ใช้งานได้');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role?.toLowerCase() === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* --- ส่วนหัว Header --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-blue-100 text-blue-600 rounded-xl shadow-sm flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">จัดการข้อมูลผู้ใช้งาน</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">ค้นหา กรองข้อมูล แก้ไข และลบบัญชีพนักงาน</p>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full sm:w-auto justify-center px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            กลับหน้าหลัก
          </button>
        </div>

        {/* --- แจ้งเตือนสถานะ --- */}
        {globalMessage.text && (
          <div className={`mb-4 p-3 sm:p-4 rounded-xl text-sm font-medium border flex items-center gap-2 animate-fadeIn ${
            globalMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{globalMessage.text}</span>
          </div>
        )}

        {/* --- แถบเครื่องมือ ค้นหา & กรองข้อมูล --- */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              placeholder="ค้นหาชื่อพนักงาน หรือ อีเมล..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setFilterRole('all')} 
              className={`flex-1 md:flex-none px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${filterRole === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ทั้งหมด
            </button>
            <button 
              onClick={() => setFilterRole('admin')} 
              className={`flex-1 md:flex-none px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${filterRole === 'admin' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              แอดมิน
            </button>
            <button 
              onClick={() => setFilterRole('staff')} 
              className={`flex-1 md:flex-none px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${filterRole === 'staff' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              พนักงาน
            </button>
          </div>
        </div>

        {/* --- 📊 ตารางรายชื่อผู้ใช้งาน --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
             <div className="p-10 sm:p-16 text-center text-gray-500 font-medium">
             <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             กำลังโหลดข้อมูลระบบ...
           </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500 font-medium text-base sm:text-lg">ไม่พบข้อมูลที่ค้นหา</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse relative min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 shadow-sm">
                  <tr className="text-gray-600 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 sm:py-4 sm:px-6 w-32">สถานะ</th>
                    <th className="py-3 px-4 sm:py-4 sm:px-6">ชื่อผู้ใช้งาน</th>
                    <th className="py-3 px-4 sm:py-4 sm:px-6">อีเมล</th>
                    <th className="py-3 px-4 sm:py-4 sm:px-6 w-32 sm:w-40">สิทธิ์</th>
                    <th className="py-3 px-4 sm:py-4 sm:px-6 w-32 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-blue-50/30 transition-colors whitespace-nowrap">
                      
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        {user.status?.toLowerCase() === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6 font-semibold text-gray-900">{user.username}</td>
                      <td className="py-3 px-4 sm:py-4 sm:px-6 text-gray-500">{user.email}</td>
                      
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        {user.role?.toLowerCase() === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 01.832.545l2.5 4.545h4.168a1 1 0 01.909 1.5l-3.333 4.545 1.25 5.455a1 1 0 01-1.45.91L10 16.5l-4.876 2.5a1 1 0 01-1.45-.91l1.25-5.455-3.333-4.545A1 1 0 012.5 7.09h4.168l2.5-4.545A1 1 0 0110 2z" clipRule="evenodd" /></svg>
                            แอดมิน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            พนักงาน
                          </span>
                        )}
                      </td>

                      {/* --- ปุ่มจัดการ (แก้ไข & ลบ) --- */}
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="แก้ไขข้อมูล"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="ลบผู้ใช้งาน"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 🖥️ --- Modal หน้าต่างแก้ไขข้อมูล --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 p-4 sm:p-5 text-white flex justify-between items-center sticky top-0 z-10">
              <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                แก้ไขข้อมูลผู้ใช้งาน
              </h2>
              <button onClick={() => setIsOpenModal(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={`w-full border-2 rounded-xl p-2.5 sm:p-3 text-sm outline-none transition-colors ${emptyFields.includes('username') ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'}`} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">อีเมล (Email)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full border-2 rounded-xl p-2.5 sm:p-3 text-sm outline-none transition-colors ${emptyFields.includes('email') ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'}`} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสผ่านใหม่ (Password)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="•••••••• (เว้นว่างไว้หากไม่เปลี่ยน)" className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white rounded-xl p-2.5 sm:p-3 text-sm outline-none focus:border-blue-500 placeholder-gray-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 sm:pt-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">สิทธิ์ (Role)</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white rounded-xl p-2.5 sm:p-3 text-sm outline-none cursor-pointer">
                    <option value="staff">พนักงาน</option>
                    <option value="admin">แอดมิน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">สถานะ (Status)</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white rounded-xl p-2.5 sm:p-3 text-sm outline-none cursor-pointer">
                    <option value="active">Active (ปกติ)</option>
                    <option value="inactive">Inactive (ระงับ)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 border-t border-gray-100 mt-4 sm:mt-6">
                <button type="button" onClick={() => setIsOpenModal(false)} className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button type="submit" className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚨 --- Modal หน้าต่างยืนยันการลบ (Delete Confirmation) --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn">
            
            <div className="p-6 text-center">
              {/* ไอคอนเตือนถังขยะ */}
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการลบบัญชี?</h2>
              <p className="text-gray-500 text-sm">
                คุณกำลังจะลบผู้ใช้งาน <span className="font-bold text-red-600">{userToDelete?.username}</span> <br/>
                การกระทำนี้ <span className="font-bold">ไม่สามารถย้อนกลับได้</span> ข้อมูลการเข้าระบบของพนักงานรายนี้จะหายไปถาวร
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-center gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={isLoading}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? 'กำลังลบ...' : 'ใช่, ลบบัญชีเลย'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ManageUsers;