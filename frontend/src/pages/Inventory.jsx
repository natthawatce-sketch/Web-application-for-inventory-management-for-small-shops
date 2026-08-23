import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import BarcodeScanner from '../components/BarcodeScanner'; // 🌟 1. นำเข้าระบบแจ้งเตือนแบบ Pop-up มุมจอ

function Inventory() {
  const navigate = useNavigate();
  
  // --- States สำหรับเก็บข้อมูล ---
  const [inventoryItems, setInventoryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- States สำหรับตัวกรอง ---
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // --- States สำหรับแบ่งหน้า (Pagination) ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // --- States สำหรับ Pop-up แจ้งเตือนด่วน (Alert Modals) ---
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: '', title: '', items: [] });

  // 🌟 2. State สำหรับหน้าต่างแก้ไข "ขั้นต่ำสั่งซื้อ"
  const [editMinQtyModal, setEditMinQtyModal] = useState({ isOpen: false, item: null, newMinQty: '' });

  // --- Scanner States ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedProductInfo, setScannedProductInfo] = useState(null);

  const handleScanSuccess = async (barcode) => {
    // ป้องกันการสแกนซ้ำซ้อน
    setIsScanning(false);
    const cleanBarcode = barcode.trim();
    
    try {
      const response = await fetch(`/api/products/barcode/${cleanBarcode}`);
      if (response.ok) {
        const productData = await response.json();
        setScannedProductInfo(productData);
      } else {
        toast.error('ไม่พบสินค้ารหัสบาร์โค้ดนี้ในระบบ');
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error scanning product:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      setIsScanning(true);
    }
  };

  // 🛠️ ดึงข้อมูลจาก API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const catRes = await fetch('/api/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
        }

        const invRes = await fetch('/api/inventory');
        if (invRes.ok) {
          const invData = await invRes.json();
          setInventoryItems(invData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus]);

  // 🧮 คำนวณสถานะสินค้า
  const getStatus = (qty, minQty) => {
    const alertLimit = minQty !== undefined && minQty !== null ? minQty : 10;
    
    if (qty <= 0) return { label: 'สินค้าหมด', color: 'bg-red-50 text-red-700 border-red-200' };
    if (qty <= alertLimit) return { label: 'ใกล้หมดสต็อก', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    return { label: 'พร้อมขาย', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  // 🌟 3. ฟังก์ชันบันทึกขั้นต่ำสั่งซื้อส่งไปที่ Backend
  const handleSaveMinQty = async () => {
    if (!editMinQtyModal.item) return;

    const toastId = toast.loading('กำลังบันทึกข้อมูล...');
    try {
      const response = await fetch(`/api/inventory/min-qty/${editMinQtyModal.item.inventory_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_quantity: parseInt(editMinQtyModal.newMinQty) || 0 })
      });

      if (response.ok) {
        toast.success('อัปเดตขั้นต่ำสั่งซื้อสำเร็จ!', { id: toastId });
        
        // 🌟 ท่าไม้ตาย: เปลี่ยนค่าบนตารางแบบ Real-time โดยไม่ต้องรีเฟรชหน้า
        setInventoryItems(prevItems => prevItems.map(item => 
          item.inventory_id === editMinQtyModal.item.inventory_id 
            ? { ...item, min_quantity: parseInt(editMinQtyModal.newMinQty) || 0 } 
            : item
        ));
        
        setEditMinQtyModal({ isOpen: false, item: null, newMinQty: '' });
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึก', { id: toastId });
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', { id: toastId });
    }
  };

  // 🔍 กรองข้อมูลตามหมวดหมู่ก่อน
  const itemsFilteredByCategory = inventoryItems.filter(item => {
    return filterCategory === 'all' || item.category_name === filterCategory;
  });

  // รายการแยกประเภทเพื่อส่งให้กล่อง Pop-up ดึงข้อมูลไปโชว์
  const lowStockList = itemsFilteredByCategory.filter(item => {
    const limit = item.min_quantity !== undefined && item.min_quantity !== null ? item.min_quantity : 10;
    return item.quantity > 0 && item.quantity <= limit;
  });
  
  const outOfStockList = itemsFilteredByCategory.filter(item => item.quantity <= 0);

  const totalItems = itemsFilteredByCategory.length;
  const lowStockItems = lowStockList.length;
  const outOfStockItems = outOfStockList.length;

  // 🔍 กรองรวมทั้งหมดสำหรับตาราง
  const fullyFilteredItems = itemsFilteredByCategory.filter(item => {
    const matchSearch = item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.barcode?.includes(searchTerm);
    
    if (filterStatus === 'all') return matchSearch;
    const status = getStatus(item.quantity, item.min_quantity).label;
    if (filterStatus === 'out') return matchSearch && status === 'สินค้าหมด';
    if (filterStatus === 'low') return matchSearch && status === 'ใกล้หมดสต็อก';
    if (filterStatus === 'ready') return matchSearch && status === 'พร้อมขาย';
    
    return matchSearch;
  });

  // --- ระบบแบ่งหน้า ---
  const totalPages = Math.ceil(fullyFilteredItems.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = fullyFilteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const openAlertModal = (type) => {
    if (type === 'low') {
      setAlertModal({ isOpen: true, type: 'low', title: 'รายการสินค้าใกล้หมดสต็อก', items: lowStockList });
    } else if (type === 'out') {
      setAlertModal({ isOpen: true, type: 'out', title: 'รายการสินค้าหมดคลัง', items: outOfStockList });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Toaster position="top-center" />

      {/* --- Header --- */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10 gap-3">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-semibold transition-colors bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          <span>กลับ</span>
        </button>
        
        <h1 className="text-sm sm:text-lg font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-indigo-600"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
          จำนวนสินค้าในคลัง
        </h1>

        <button onClick={() => {
          setIsScannerOpen(true);
          setIsScanning(true);
          setScannedProductInfo(null);
        }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-xs sm:text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
          </svg>
          เช็คสต็อก
        </button>
      </div>

      <div className="p-4 sm:p-6 flex-1 max-w-7xl mx-auto w-full">
        
        {/* 1. กล่องเลือกหมวดหมู่สินค้า */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18m-18 0v-2.25A2.25 2.25 0 014.5 7.5h15a2.25 2.25 0 012.25 2.25V13.5m-18 0V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25v-4.5" /></svg>
              ระบุหมวดหมู่สินค้าหลัก
            </label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 text-xs font-semibold text-slate-700 sm:w-64 cursor-pointer"
            >
              <option value="all">แสดงทุกประเภท</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. สรุปยอด 3 กล่อง */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 mb-0.5">รวมสินค้า</span>
            <span className="text-xl sm:text-2xl font-black text-indigo-600">{totalItems}</span>
          </div>
          
          <div 
            onClick={() => openAlertModal('low')}
            className={`rounded-xl p-3 border shadow-sm flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none active:scale-95 
              ${lowStockItems > 0 ? 'bg-orange-50 border-orange-200 hover:bg-orange-100/70' : 'bg-white border-slate-200'}`}
          >
            <span className={`text-[11px] sm:text-xs font-bold mb-0.5 flex items-center gap-1 ${lowStockItems > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
              สินค้าใกล้หมด
              {lowStockItems > 0 && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></span>}
            </span>
            <span className={`text-xl sm:text-2xl font-black ${lowStockItems > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{lowStockItems}</span>
          </div>

          <div 
            onClick={() => openAlertModal('out')}
            className={`rounded-xl p-3 border shadow-sm flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none active:scale-95 
              ${outOfStockItems > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100/70' : 'bg-white border-slate-200'}`}
          >
            <span className={`text-[11px] sm:text-xs font-bold mb-0.5 flex items-center gap-1 ${outOfStockItems > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              สินค้าหมด
              {outOfStockItems > 0 && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
            </span>
            <span className={`text-xl sm:text-2xl font-black ${outOfStockItems > 0 ? 'text-red-600' : 'text-slate-400'}`}>{outOfStockItems}</span>
          </div>
        </div>

        {/* 3. ค้นหาและตัวกรองสถานะ */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm mb-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input 
              type="text" 
              placeholder="ค้นหาบาร์โค้ด หรือชื่อสินค้า..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none text-xs sm:text-sm transition-all"
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs font-semibold text-slate-600 sm:w-40 cursor-pointer"
          >
            <option value="all">สถานะคลังทั้งหมด</option>
            <option value="ready">พร้อมขาย</option>
            <option value="low">ใกล้หมดสต็อก</option>
            <option value="out">สินค้าหมด</option>
          </select>
        </div>

        {/* --- ตารางข้อมูลหลัก --- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-bold">ภาพ</th>
                  <th className="py-2.5 px-4 font-bold">ข้อมูลรายการสินค้า</th>
                  <th className="py-2.5 px-4 font-bold text-center">คงเหลือ</th>
                  <th className="py-2.5 px-4 font-bold text-center">ขั้นต่ำสั่งซื้อ</th>
                  <th className="py-2.5 px-4 font-bold text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {currentItems.map((item) => {
                  const status = getStatus(item.quantity, item.min_quantity);
                  const currentMinQty = item.min_quantity !== undefined && item.min_quantity !== null ? item.min_quantity : 10;
                  return (
                    <tr key={item.inventory_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-4">
                        <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                          {item.image ? (
                            <img src={`/uploads/${item.image}`} alt="product" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-5 h-5 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded border border-slate-200">{item.barcode}</span>
                        <div className="font-bold text-slate-800 mt-0.5 text-xs sm:text-sm">{item.product_name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{item.category_name}</div>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className="text-sm font-black text-slate-800">{item.quantity}</span>
                        <span className="text-[11px] text-slate-400 ml-0.5">{item.unit}</span>
                      </td>
                      {/* 🌟 แสดงตัวเลขขั้นต่ำ พร้อมปุ่มแก้ไข (สำหรับ Desktop) */}
                      <td className="py-2 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-slate-600 font-semibold">{currentMinQty}</span>
                          <button 
                            onClick={() => setEditMinQtyModal({ isOpen: true, item, newMinQty: currentMinQty })}
                            className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
                            title="แก้ไขขั้นต่ำสั่งซื้อ"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l12.683-12.683z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" /></svg>
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100 text-xs">
            {currentItems.map((item) => {
              const status = getStatus(item.quantity, item.min_quantity);
              const currentMinQty = item.min_quantity !== undefined && item.min_quantity !== null ? item.min_quantity : 10;
              return (
                <div key={item.inventory_id} className="p-3 flex flex-col gap-2 bg-white">
                  <div className="flex gap-2.5 items-center">
                    <div className="w-12 h-12 shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={`/uploads/${item.image}`} alt="product" className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-6 h-6 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-400 font-mono tracking-wider">{item.barcode}</div>
                      <div className="font-bold text-slate-800 leading-tight mt-0.5 truncate">{item.product_name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-slate-400">{item.category_name}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${status.color}`}>{status.label}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 🌟 แสดงตัวเลขยอดคลังและปุ่มแก้ไขขั้นต่ำ (สำหรับ Mobile) */}
                  <div className="flex justify-between items-center bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100 text-center">
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">ยอดในคลัง</div>
                      <div className="font-black text-slate-700">{item.quantity} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span></div>
                    </div>
                    <div className="w-px bg-slate-200 h-6"></div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">ขั้นต่ำสั่งซื้อ</div>
                        <div className="font-bold text-slate-600">{currentMinQty}</div>
                      </div>
                      <button 
                        onClick={() => setEditMinQtyModal({ isOpen: true, item, newMinQty: currentMinQty })}
                        className="bg-indigo-100 text-indigo-600 p-1.5 rounded hover:bg-indigo-200 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l12.683-12.683z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {fullyFilteredItems.length === 0 && !isLoading && (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-slate-300 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              <h3 className="text-sm font-bold text-slate-500">ไม่มีรายการข้อมูลแสดงผล</h3>
            </div>
          )}
        </div>

        {/* 4. ระบบสลับหน้า (Pagination แบบจุดไข่ปลา) */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs">
            <div className="text-slate-500 font-medium text-center sm:text-left w-full sm:w-auto">
              แสดงหน้า <span className="font-bold text-indigo-600">{currentPage}</span> / {totalPages} <span className="text-slate-300 mx-1">|</span> ทั้งหมด {fullyFilteredItems.length} รายการ
            </div>
            
            <div className="flex gap-1 items-center justify-center w-full sm:w-auto mt-2 sm:mt-0">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold">ก่อนหน้า</button>
              
              <div className="flex gap-1">
                {getPageNumbers().map((pageNum, idx) => (
                  <button 
                    key={idx}
                    onClick={() => pageNum !== '...' && setCurrentPage(pageNum)}
                    disabled={pageNum === '...'}
                    className={`w-7 h-7 rounded-md text-xs font-bold transition-all flex items-center justify-center
                      ${pageNum === currentPage 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : pageNum === '...' 
                          ? 'text-slate-400 cursor-default bg-transparent border-none' 
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold">ถัดไป</button>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 5. Pop-up หน้าต่างแก้ไขขั้นต่ำสั่งซื้อ (Edit Min Qty Modal) */}
      {editMinQtyModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col transform scale-100 transition-transform">
            
            {/* หัวหน้าต่าง */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014-8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014 5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
                ตั้งค่าเตือนขั้นต่ำ
              </h3>
              <button onClick={() => setEditMinQtyModal({ isOpen: false, item: null, newMinQty: '' })} className="text-indigo-200 hover:text-white transition-colors p-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* เนื้อหาช่องกรอกตัวเลข */}
            <div className="p-5 flex flex-col gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {editMinQtyModal.item?.image ? (
                    <img src={`/uploads/${editMinQtyModal.item.image}`} className="w-full h-full object-contain p-0.5" alt="product" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-5 h-5 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{editMinQtyModal.item?.product_name}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">บาร์โค้ด: {editMinQtyModal.item?.barcode}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  ระบุจำนวนขั้นต่ำ (ถ้าสต็อกเหลือน้อยกว่าหรือเท่ากับเลขนี้ จะแจ้งเตือน)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    value={editMinQtyModal.newMinQty}
                    onChange={(e) => setEditMinQtyModal({ ...editMinQtyModal, newMinQty: e.target.value })}
                    className="w-full pl-4 pr-12 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-center font-black text-lg text-indigo-700 transition-all"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">ชิ้น</span>
                </div>
              </div>
            </div>

            {/* ปุ่มยืนยัน */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => setEditMinQtyModal({ isOpen: false, item: null, newMinQty: '' })}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveMinQty}
                className="px-6 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
              >
                บันทึกการตั้งค่า
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🌟 6. Pop-up ลอยด่วน (Alert Modal) แสดงเมื่อพนักงานกดกล่องแจ้งเตือน */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[80vh] flex flex-col">
            
            {/* หัวป๊อปอัพ */}
            <div className={`p-4 border-b flex items-center justify-between text-white ${alertModal.type === 'out' ? 'bg-red-600' : 'bg-orange-500'}`}>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                {alertModal.type === 'out' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" /></svg>
                )}
                {alertModal.title} ({alertModal.items.length})
              </h3>
              <button 
                onClick={() => setAlertModal({ isOpen: false, type: '', title: '', items: [] })}
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* เนื้อหารายการสินค้า */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {alertModal.items.map((item) => (
                <div key={item.inventory_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded border bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={`/uploads/${item.image}`} className="w-full h-full object-contain" alt="thumb" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-4 h-4 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-800 truncate">{item.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.barcode}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-black text-sm ${alertModal.type === 'out' ? 'text-red-600' : 'text-orange-500'}`}>
                      {item.quantity} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">
                      ขั้นต่ำสั่งซื้อ {item.min_quantity !== undefined && item.min_quantity !== null ? item.min_quantity : 10}
                    </div>
                  </div>
                </div>
              ))}

              {alertModal.items.length === 0 && (
                <div className="py-8 text-center text-slate-400 font-medium">ไม่มีรายการสินค้ากลุ่มนี้ในหมวดหมู่ที่เลือก</div>
              )}
            </div>

            {/* ท้ายป๊อปอัพ */}
            <div className="p-3 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={() => setAlertModal({ isOpen: false, type: '', title: '', items: [] })}
                className="bg-white border border-slate-300 hover:bg-slate-100 px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 transition-all active:scale-95"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}
      {/* --- Scanner Modal --- */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">เช็คสต็อกสินค้า</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1">สแกนบาร์โค้ดเพื่อดูยอดคงเหลือ</p>
              </div>
              <button onClick={() => {
                setIsScannerOpen(false);
                setIsScanning(false);
              }} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto">
              {isScanning ? (
                <div className="flex flex-col gap-4">
                  <BarcodeScanner onScanSuccess={handleScanSuccess} />
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-2 text-sm text-slate-500">หรือค้นหาด้วยรหัส</span>
                    </div>
                  </div>
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const val = e.target.manualBarcode.value;
                    if (val) handleScanSuccess(val);
                  }} className="flex gap-2">
                    <input 
                      type="text" 
                      name="manualBarcode" 
                      placeholder="กรอกรหัสบาร์โค้ด..." 
                      autoComplete="off"
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 text-sm">ค้นหา</button>
                  </form>
                </div>
              ) : scannedProductInfo ? (
                <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 text-center animate-fade-in">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-white rounded-lg border border-slate-200 p-2 shadow-sm mb-4">
                    {scannedProductInfo.image ? (
                      <img src={`/uploads/${scannedProductInfo.image}`} alt="Product" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">{scannedProductInfo.product_name}</h4>
                  <p className="text-sm text-slate-500 font-mono mb-4">{scannedProductInfo.barcode}</p>
                  
                  <div className="bg-white rounded-lg p-3 border border-slate-200 flex justify-between items-center mb-4">
                    <span className="text-slate-500 font-medium text-sm">สต็อกคงเหลือ</span>
                    <span className={`text-xl sm:text-2xl font-bold ${scannedProductInfo.stock <= (scannedProductInfo.min_quantity || 0) ? 'text-red-500' : 'text-emerald-600'}`}>
                      {scannedProductInfo.stock} <span className="text-sm font-normal text-slate-500">{scannedProductInfo.unit}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-left bg-white rounded-lg p-3 border border-slate-200 text-xs sm:text-sm">
                    <div>
                      <p className="text-slate-400 mb-0.5">ราคาขาย</p>
                      <p className="font-bold text-slate-700">฿{Number(scannedProductInfo.price).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-0.5">สถานะ</p>
                      <p className="font-bold text-slate-700">{scannedProductInfo.product_status}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white">
              <button 
                onClick={() => {
                  if (isScanning) {
                    setIsScannerOpen(false);
                    setIsScanning(false);
                  } else {
                    // กดปุ่ม เสร็จสิ้น กลับไปสแกนต่อ
                    setIsScanning(true);
                    setScannedProductInfo(null);
                  }
                }} 
                className={`w-full py-2.5 sm:py-3 rounded-xl font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 ${isScanning ? 'bg-slate-400 hover:bg-slate-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {isScanning ? 'ยกเลิกการสแกน' : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    เสร็จสิ้น (สแกนชิ้นต่อไป)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Inventory;