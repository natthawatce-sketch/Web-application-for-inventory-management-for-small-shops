import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

function ProductHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // --- สิทธิ์ผู้ใช้งาน ---
  const userRole = localStorage.getItem('user_role');
  const isAdmin = userRole?.toLowerCase() === 'admin';

  const [categories, setCategories] = useState([]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/product-history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลประวัติได้');
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      toast.error('ปฏิเสธการเข้าถึง: สำหรับผู้ดูแลระบบเท่านั้น');
      navigate('/dashboard');
      return;
    }
    fetchCategories();
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, navigate]);

  const getCategoryName = (id) => {
    if (id === null || id === undefined) return '-';
    const cat = categories.find(c => c.category_id == id);
    return cat ? cat.category_name : id;
  };

  const renderChanges = (details) => {
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      const labels = {
        product_name: 'ชื่อสินค้า',
        category_id: 'หมวดหมู่',
        barcode: 'บาร์โค้ด',
        unit: 'หน่วย',
        price: 'ราคา',
        product_status: 'สถานะ',
        image: 'รูปภาพ'
      };

      return Object.entries(parsed).map(([key, value]) => {
        let oldVal = value.old;
        let newVal = value.new;

        if (key === 'category_id') {
          oldVal = getCategoryName(oldVal);
          newVal = getCategoryName(newVal);
        }

        return (
          <div key={key} className="text-xs text-slate-600 flex flex-wrap items-center gap-1.5 justify-start">
            <span className="font-semibold text-slate-700 whitespace-nowrap">{labels[key] || key}:</span>
            <span className="line-through text-red-500 break-words max-w-[120px] sm:max-w-xs">{oldVal || '-'}</span>
            <span className="text-emerald-600 font-medium break-words max-w-[120px] sm:max-w-xs">➔ {newVal || '-'}</span>
          </div>
        );
      });
    } catch (e) {
      return <div className="text-xs text-slate-500 text-right">ไม่สามารถอ่านข้อมูลได้</div>;
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // --- Pagination Logic ---
  const totalItems = history.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = history.slice(startIndex, startIndex + itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans text-slate-800">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-indigo-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ประวัติการเปลี่ยนแปลงข้อมูลสินค้า
            </h1>
            <p className="text-xs text-slate-500 mt-1">บันทึกการแก้ไขรายละเอียดสินค้าต่างๆ โดยผู้ดูแลระบบ</p>
          </div>
          <button onClick={() => navigate(-1)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-all text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
            ย้อนกลับ
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center text-slate-400">ยังไม่มีประวัติการแก้ไขข้อมูลสินค้า</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentItems.map((log) => (
                <div key={log.log_id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 overflow-hidden">
                  {/* ซ้าย: ข้อมูลสินค้าและผู้แก้ไข */}
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="font-bold text-slate-800 text-sm mb-1">{log.product_name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {formatDate(log.created_at)}
                    </div>
                    <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-medium border border-indigo-100">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
                      แก้ไขโดย: {log.username}
                    </div>
                  </div>
                  
                  {/* ขวา: รายละเอียดการเปลี่ยนแปลง */}
                  <div className="w-full sm:w-auto shrink-0 text-left sm:text-right flex flex-col items-start sm:items-end mt-2 sm:mt-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">รายการที่เปลี่ยนแปลง</div>
                    <div className="flex flex-col gap-1 items-start">
                      {renderChanges(log.details)}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-col items-center justify-center gap-4">
                  <div className="text-sm text-slate-500 font-medium text-center">
                    แสดงหน้าที่ {currentPage} จาก {totalPages} (รวม {totalItems} รายการ)
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                    >
                      ก่อนหน้า
                    </button>
                    
                    {getPageNumbers().map((num, idx) => (
                      <button
                        key={idx}
                        onClick={() => num !== '...' && setCurrentPage(num)}
                        disabled={num === '...'}
                        className={`min-w-[32px] sm:min-w-[40px] px-2 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors ${
                          num === currentPage
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : num === '...'
                            ? 'bg-transparent border-transparent text-slate-400 cursor-default'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductHistory;
