import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

function ManageStockIn() {
  const navigate = useNavigate();

  // --- States สำหรับเก็บข้อมูล ---
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- States สำหรับการแก้ไขข้อมูล (Edit Modal) ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStockIn, setSelectedStockIn] = useState(null);
  const [formData, setFormData] = useState({
    quantity: '',
    cost_price: '',
    expiration_date: '' 
  });

  // 🌟 State ใหม่สำหรับหน้าต่าง "ยืนยันการลบ"
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // --- ระบบแบ่งหน้า (Pagination) ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 

  const fetchStockInData = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/stock-in`);
      if (response.ok) {
        const data = await response.json();
        setStockItems(data);
      }
    } catch (error) {
      console.error("Error fetching stock in data:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchStockInData();
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openEditModal = (item) => {
    setSelectedStockIn(item);
    setFormData({
      quantity: item.quantity,
      cost_price: item.cost_price,
      expiration_date: item.expiration_date ? item.expiration_date.split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const handleConfirmUpdate = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('กำลังบันทึกข้อมูล...'); 
    try {
      const userId = localStorage.getItem('user_id') || 1;

      const dataToSend = {
        ...formData, 
        user_id: userId 
      };

      const response = await fetch(`http://${window.location.hostname}:5000/api/stock-in/${selectedStockIn.stock_in_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend) 
      });

      if (response.ok) {
        toast.success('แก้ไขข้อมูลล็อตรับเข้าเรียบร้อยแล้ว!', { id: toastId }); 
        setIsEditModalOpen(false);
        fetchStockInData(); 
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล', { id: toastId }); 
      }
    } catch (error) {
      console.error("Error updating stock in item:", error);
      toast.error('ระบบหลังบ้านเกิดข้อผิดพลาด', { id: toastId });
    }
  };

  // 🌟 ฟังก์ชันที่ 1: แค่เปิดหน้าต่างยืนยันการลบ (ยังไม่ลบจริง)
  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  // 🌟 ฟังก์ชันที่ 2: กดตกลงในหน้าต่างป๊อปอัปแล้ว ค่อยลบจริงๆ
  const confirmDeleteStockIn = async () => {
    setIsDeleteConfirmOpen(false); // ปิดหน้าต่างยืนยันก่อน
    const toastId = toast.loading('กำลังลบข้อมูล...');
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/stock-in/${selectedStockIn.stock_in_id}`, {
        method: 'DELETE' 
      });
      
      if (response.ok) {
        toast.success('ลบประวัติรับเข้าสำเร็จ!', { id: toastId }); 
        setIsEditModalOpen(false); // ปิดหน้าต่างแก้ไข(อันหลัง)ด้วย
        fetchStockInData();
      } else {
        toast.error('ไม่สามารถลบข้อมูลได้ อาจมีข้อผิดพลาด', { id: toastId }); 
      }
    } catch (error) {
      console.error("Error deleting stock in:", error);
      toast.error('ระบบหลังบ้านเกิดข้อผิดพลาด', { id: toastId });
    }
  };

  const filteredStock = stockItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const adderName = item.added_by || item.user_id?.toString() || '';
    const prodName = item.product_name || '';

    const matchesSearch = prodName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          adderName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const currentItems = filteredStock.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative overflow-x-hidden">
      
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* --- Header --- */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 gap-2">
        <div className="flex justify-start">
          <button onClick={() => navigate('/dashboard')} className="flex items-center justify-center gap-1.5 text-slate-500 hover:text-blue-600 font-semibold transition-colors bg-slate-50 px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-xs sm:text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline">กลับหน้าหลัก</span>
            <span className="truncate inline sm:hidden">กลับ</span>
          </button>
        </div>

        <div className="flex justify-center flex-1 px-2 overflow-hidden">
          <h1 className="text-xs sm:text-lg font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2 truncate">
            <div className="p-1 sm:p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <span className="truncate hidden sm:inline">ประวัติการรับสินค้าเข้าสต็อก</span>
            <span className="truncate inline sm:hidden">ประวัติรับเข้าสินค้า</span>
          </h1>
        </div>

        <div className="flex justify-end">
          <button onClick={() => navigate('/add-stock-in')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 sm:px-3 py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">เพิ่มสต็อกสินค้า</span>
            <span className="inline sm:hidden">เพิ่มสต็อก</span>
          </button>
        </div>
      </div>

      {/* --- ส่วนเนื้อหารายงาน --- */}
      <div className="p-4 sm:p-6 flex-1 max-w-6xl mx-auto w-full flex flex-col">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="relative w-full md:flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z" />
              </svg>
            </span>
            <input 
              type="text"
              placeholder="ค้นหาล็อตด้วยชื่อสินค้า หรือ พนักงานพบคีย์ผิด..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">ประเภท:</span>
            <select 
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="text-xs sm:text-sm border-none outline-none bg-transparent text-slate-700 cursor-pointer w-full md:w-auto font-medium"
            >
              <option value="all">ประเภททั้งหมด</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_name}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 📱 Mobile Card View */}
        <div className="block md:hidden space-y-3 flex-1">
          {currentItems.map((item) => {
            const rcv_string = item.received_date ? new Date(item.received_date).toLocaleDateString('th-TH') : '-';
            const exp_string = item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('th-TH') : 'ไม่มีวันหมดอายุ';
            
            return (
              <div key={item.stock_in_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-slate-800 text-sm">{item.product_name}</div>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap">{item.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div>จำนวนรับเข้า:</div>
                  <div className="text-right font-bold text-blue-600">+{item.quantity}</div>
                  <div>ราคาทุนบิล:</div>
                  <div className="text-right font-bold text-slate-800">฿{parseFloat(item.cost_price).toFixed(2)}</div>
                  <div>วันที่รับเข้า:</div>
                  <div className="text-right font-medium text-slate-600">{rcv_string}</div>
                  <div>วันหมดอายุ:</div>
                  <div className="text-right font-semibold text-red-500">{exp_string}</div>
                  <div>ผู้บันทึก:</div>
                  <div className="text-right text-slate-700 font-medium truncate">{item.added_by || item.user_id}</div>
                </div>
                <button 
                  onClick={() => openEditModal(item)}
                  className="w-full mt-2 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all"
                >
                  ✏️ จัดการล็อตสินค้านี้
                </button>
              </div>
            );
          })}
        </div>

        {/* 💻 Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-1/4">ชื่อสินค้า</th>
                <th className="px-3 py-3.5 text-center w-[10%]">ประเภท</th>
                <th className="px-3 py-3.5 text-center w-[11%]">ยอดรับเข้า</th>
                <th className="px-3 py-3.5 text-center w-[12%]">ราคาทุน</th>
                <th className="px-3 py-3.5 text-center w-[13%]">วันที่รับเข้า</th>
                <th className="px-3 py-3.5 text-center w-[13%]">วันหมดอายุ</th>
                <th className="px-4 py-3.5 w-[16%]">คนที่เพิ่มสินค้านี้</th>
                <th className="px-4 py-3.5 text-center w-[10%]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentItems.map((item) => {
                const rcv_formatted = item.received_date ? new Date(item.received_date).toLocaleDateString('th-TH') : '-';
                const exp_formatted = item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('th-TH') : '-';
                
                return (
                  <tr key={item.stock_in_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-800 truncate">{item.product_name}</td>
                    <td className="px-3 py-3.5 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">{item.category}</span></td>
                    <td className="px-3 py-3.5 text-center font-bold text-blue-600">+{item.quantity}</td>
                    <td className="px-3 py-3.5 text-center font-bold text-slate-800">฿{parseFloat(item.cost_price).toFixed(2)}</td>
                    <td className="px-3 py-3.5 text-center text-slate-500 text-xs">{rcv_formatted}</td>
                    <td className="px-3 py-3.5 text-center font-medium text-red-500 text-xs">{exp_formatted}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium truncate text-xs">{item.added_by || item.user_id}</td>
                    <td className="px-4 py-3.5 text-center">
                      <button 
                        onClick={() => openEditModal(item)} 
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        ✏️ จัดการ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500">หน้า {currentPage} จาก {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-[11px] font-medium">ก่อนหน้า</button>
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1;
                return (
                  <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-[11px] font-medium">ถัดไป</button>
            </div>
          </div>
        )}
      </div>

      {/* --- หน้าต่างป๊อปอัปสำหรับ แก้ไขข้อมูล --- */}
      {isEditModalOpen && selectedStockIn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center shrink-0">
              <h2 className="text-base font-bold text-amber-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
                จัดการข้อมูลล็อตนำเข้า
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">×</button>
            </div>
            
            <form onSubmit={handleConfirmUpdate} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อสินค้า (ล็อคค่าตามประวัติ)</label>
                <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm truncate">
                  {selectedStockIn.product_name || `Product ID: ${selectedStockIn.product_id}`}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ยอดรับเข้า (ชิ้น) *</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} required min="1" className="w-full px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ราคาทุน (ต่อชิ้น) *</label>
                  <input type="number" step="0.01" name="cost_price" value={formData.cost_price} onChange={handleInputChange} required min="0" className="w-full px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">วันหมดอายุ</label>
                <input type="date" name="expiration_date" value={formData.expiration_date} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 text-slate-700" />
              </div>

              <div className="pt-5 mt-2 flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-slate-100">
                {/* 🔴 ปุ่มลบข้อมูล (เรียกใช้กล่อง Confirm Custom แทน window.confirm) */}
                <button 
                  type="button" 
                  onClick={handleDeleteClick} 
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors w-full sm:w-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  ลบประวัตินี้
                </button>

                <div className="flex justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">ยกเลิก</button>
                  <button type="submit" className="flex-1 sm:flex-none px-5 py-2 text-sm rounded-lg font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-all">บันทึก</button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 🔴 หน้าต่างยืนยันการลบแบบ Custom (แทนที่ window.confirm) */}
      {isDeleteConfirmOpen && selectedStockIn && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">ยืนยันการลบข้อมูล</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการรับเข้าของ <br/>
                <span className="font-bold text-slate-800">"{selectedStockIn.product_name}"</span> ?
              </p>
              
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 text-left flex items-start gap-2">
                <span className="text-red-500 mt-0.5">⚠️</span>
                <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                  ระบบจะหักยอดสต็อกสินค้าชิ้นนี้ออกตามจำนวน <span className="font-bold border-b border-red-300">({selectedStockIn.quantity} ชิ้น)</span> ที่เคยรับเข้าด้วย 
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteStockIn}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageStockIn;