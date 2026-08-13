import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function ManageSales() {
  const navigate = useNavigate();

  // --- States ข้อมูล ---
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  
  // 🌟 State สำหรับเก็บชื่อร้าน
  const [storeName, setStoreName] = useState('ร้านของคุณ'); 
  
  // --- States ตัวกรอง & ค้นหา ---
  const [filterType, setFilterType] = useState('all');
  const [searchReceipt, setSearchReceipt] = useState('');

  // --- States แบ่งหน้า (Pagination) ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- States ป๊อปอัปใบเสร็จ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);

  // 1. ดึงข้อมูลครั้งแรกเมื่อโหลดหน้า
  useEffect(() => {
    fetchSalesData();
    fetchStoreSettings();
  }, []);

  const fetchSalesData = async () => {
    try {
      const response = await fetch('/api/sales');
      if (response.ok) {
        const data = await response.json();
        setSales(data);
      } else {
        setSales([]);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
      setSales([]);
    }
  };

  // ดึงข้อมูลชื่อร้านจาก Backend
  const fetchStoreSettings = async () => {
    try {
      const response = await fetch('/api/store-settings');
      if (response.ok) {
        const data = await response.json();
        const storeData = Array.isArray(data) ? data[0] : data;
        
        if (storeData && (storeData.shop_name || storeData.store_name)) {
          setStoreName(storeData.shop_name || storeData.store_name);
        }
      }
    } catch (error) {
      console.error("Error fetching store settings:", error);
    }
  };

  // 2. ระบบค้นหาและตัวกรอง
  useEffect(() => {
    let result = sales;

    if (filterType === 'today') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(s => s.sale_date && s.sale_date.startsWith(today));
    } else if (filterType === 'month') {
      const thisMonth = new Date().toISOString().slice(0, 7);
      result = result.filter(s => s.sale_date && s.sale_date.startsWith(thisMonth));
    }

    if (searchReceipt.trim() !== '') {
      result = result.filter(s => s.sale_id && s.sale_id.toString().includes(searchReceipt.trim()));
    }

    setFilteredSales(result);
    setCurrentPage(1);
  }, [sales, filterType, searchReceipt]);

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
  };

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
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

  // 3. ฟังก์ชันคลิกดูรายละเอียดใบเสร็จ
  const handleViewReceipt = async (sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
    
    try {
      const response = await fetch(`/api/sales/${sale.sale_id}/items`);
      if (response.ok) {
        const items = await response.json();
        setSaleItems(items);
      } else {
        setSaleItems([]);
      }
    } catch (error) {
      console.error("Error fetching sale items:", error);
    }
  };

  // 4. สั่งบันทึกเป็น PDF
  const handlePrintPDF = async () => {
    const receiptElement = document.getElementById('receipt-content');
    if (!receiptElement) return;

    const toastId = toast.loading('กำลังแปลงใบเสร็จเป็น PDF...');

    try {
      const canvas = await html2canvas(receiptElement, {
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#ffffff', 
        scrollY: -window.scrollY 
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdfWidth = 80; 
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${selectedSale.sale_id}.pdf`);

      toast.success('ดาวน์โหลด PDF สำเร็จ!', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้าง PDF', { id: toastId });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('th-TH', options);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 🌟 เปลี่ยนตำแหน่ง Toaster ให้มาอยู่ตรงกลางด้านบน (top-center) */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* --- สไตล์ CSS ตอนสั่งพิมพ์ผ่านเบราว์เซอร์ --- */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #receipt-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* --- Header ส่วนบนสุด --- */}
      <div className="flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16 bg-white border-b border-slate-200 shadow-sm gap-2 shrink-0 no-print">
        <button
          onClick={() => navigate('/SalesReport')}
          className="flex items-center gap-1 sm:gap-2 text-slate-500 hover:text-blue-600 font-semibold transition-colors bg-slate-50 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-slate-200 shadow-sm text-xs sm:text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="hidden sm:inline">กลับหน้าหลัก</span>
          <span className="inline sm:hidden">กลับ</span>
        </button>
        
        <h1 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2 truncate">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          รายการใบเสร็จการขาย
        </h1>
        <div className="w-12 sm:w-24"></div>
      </div>

      {/* --- Main Content โซนตารางหลัก --- */}
      <div className="flex-1 p-3 sm:p-6 lg:p-8 flex justify-center no-print overflow-y-auto">
        <div className="w-full max-w-3xl bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit">
          
          {/* --- แถบตัวค้นหา & ตัวกรอง --- */}
          <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-[200px] sm:max-w-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 absolute left-3 top-2.5 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาบิล..."
                value={searchReceipt}
                onChange={(e) => setSearchReceipt(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="m-1 w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0">                
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />              
              </svg>
              <select
                value={filterType}
                onChange={handleFilterChange}
                className="bg-white border border-slate-300 text-slate-700 text-xs sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-2 py-2 outline-none shadow-sm cursor-pointer w-full"
              >
                <option value="all">ทั้งหมด</option>
                <option value="today">วันนี้</option>
                <option value="month">เดือนนี้</option>
              </select>
            </div>
          </div>

          {/* --- ตารางบิล --- */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left text-slate-600">
              <thead className="text-[11px] sm:text-xs text-slate-500 uppercase bg-slate-100/80 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">เลขที่ใบเสร็จ</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">วันที่ - เวลา</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-center">การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((sale) => (
                    <tr key={sale.sale_id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 sm:px-6 sm:py-4 font-mono font-bold text-slate-800">
                        #{sale.sale_id}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-slate-600">
                        {formatDate(sale.sale_date)}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-center">
                        <button
                          onClick={() => handleViewReceipt(sale)}
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          ดูใบเสร็จ
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-12 sm:px-6 sm:py-16 text-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 text-slate-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      <p className="text-sm font-semibold text-slate-500">
                        {sales.length === 0 ? "ยังไม่มีรายการขายในระบบ" : "ไม่พบเลขที่ใบเสร็จที่ค้นหา"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* --- ระบบแบ่งหน้า (Pagination) --- */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-200 gap-3">
              <span className="text-xs sm:text-sm text-slate-500">
                แสดงหน้าที่ <span className="font-bold text-slate-700">{currentPage}</span> จาก <span className="font-bold text-slate-700">{totalPages}</span> (รวม {filteredSales.length} บิล)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] sm:text-xs font-medium transition-colors"
                >
                  ก่อนหน้า
                </button>
                
                {getPageNumbers().map((pageNum, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNum === 'number' && setCurrentPage(pageNum)}
                    disabled={pageNum === '...'}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors
                      ${pageNum === currentPage
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : pageNum === '...'
                          ? 'border-transparent text-slate-400 cursor-default'
                          : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-100'}`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] sm:text-xs font-medium transition-colors"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Popup หน้าต่างรายละเอียดใบเสร็จ (Modal) --- */}
      {isModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200 shrink-0">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                รายละเอียดบิล #{selectedSale.sale_id}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-red-500 font-bold text-lg leading-none transition-colors p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto bg-slate-100 flex justify-center flex-1">
              <div
                id="receipt-content"
                // 🌟 แก้ไข: จัดการความกว้างและ Padding ให้ซ้ายขวาเท่ากันเป๊ะ
                className="bg-white px-5 py-6 shadow-md border border-slate-200 w-[290px] mx-auto font-mono text-xs text-slate-800 h-fit"
              >
                <div className="text-center mb-4">
                  <h2 className="font-bold text-base mb-1">{storeName}</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Receipt</p>
                </div>
                
                <div className="border-b border-dashed border-slate-300 pb-2 mb-3 text-[11px] space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>เลขที่บิล:</span>
                    <span className="font-bold text-slate-800">#{selectedSale.sale_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>วันที่ขาย:</span>
                    <span>{formatDate(selectedSale.sale_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>พนักงาน:</span>
                    <span>{selectedSale.username || 'System'}</span>
                  </div>
                </div>

                <table className="w-full text-[11px] mb-3">
                  <thead>
                    <tr className="border-b border-dashed border-slate-300 text-slate-500">
                      {/* 🌟 ปรับระยะคอลัมน์ให้สมดุล */}
                      <th className="text-left py-1 font-semibold w-7/12">รายการ</th>
                      <th className="text-center py-1 font-semibold w-2/12">จำนวน</th>
                      <th className="text-right py-1 font-semibold w-3/12">ราคา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item, index) => (
                      <tr key={index} className="text-slate-700 border-b border-slate-100/50 last:border-0">
                        <td className="py-1.5 pr-2 truncate max-w-[120px]">{item.product_name}</td>
                        <td className="text-center py-1.5">{item.quantity}</td>
                        <td className="text-right py-1.5">{(item.price * item.quantity).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-slate-300 pt-3">
                  <div className="flex justify-between font-bold text-sm text-slate-900">
                    <span>ยอดรวมสุทธิ:</span>
                    <span>{Number(selectedSale.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 mt-6 pt-2 border-t border-slate-100">
                  <p>*** ขอบคุณที่ใช้บริการ ***</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 border-t border-slate-200 flex justify-end gap-1.5 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                กลับ
              </button>
              
              <button
                onClick={handlePrintPDF}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs transition-all active:scale-95 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.728 3.49l2.033-2.033a1.5 1.5 0 012.121 0l2.033 2.033c.59.59.882 1.42.81 2.253a9.006 9.006 0 01-5.184 0c-.072-.833.22-1.663.81-2.253z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5a1.5 1.5 0 011.5-1.5h15a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H4.5A1.5 1.5 0 013 16.5v-6zM6 15h.008v.008H6V15zm3 0h.008v.008H9V15zm3 0h.008v.008H12V15z" />
                </svg>
                ส่งออก PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default ManageSales;