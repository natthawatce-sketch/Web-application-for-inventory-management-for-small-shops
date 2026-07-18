import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

function SalesReport() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState('7days'); 
  const [isLoading, setIsLoading] = useState(true);
  
  // State สำหรับเก็บข้อมูลจริงจาก API หลังบ้าน
  const [summary, setSummary] = useState({ totalSales: 0, totalOrders: 0, avgOrderValue: 0, itemsSold: 0 });
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  // 🔄 ฟังก์ชันดึงข้อมูลสรุปรายงานจากฐานข้อมูลจริง
  const fetchReportData = async (period) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/sales-summary?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setChartData(data.chartData);
        setTopProducts(data.topProducts);
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลรายงานผลได้');
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error('ระบบเชื่อมต่อฐานข้อมูลล้มเหลว (เช็ค Backend)');
    } finally {
      setIsLoading(false);
    }
  };

  // ดึงข้อมูลใหม่ทุกครั้งที่เลือกเปลี่ยนช่วงเวลาใน Dropdown
  useEffect(() => {
    fetchReportData(filterPeriod);
  }, [filterPeriod]);

  // 📥 ฟังก์ชันส่งออก Excel ดาวน์โหลดไฟล์ตามช่วงเวลาจริง
  const handleExportExcel = () => {
    const toastId = toast.loading('กำลังดาวน์โหลดรายงาน Excel...');
    try {
      // สั่งเปิดแท็บใหม่วิ่งไปหา API หลังบ้านพร้อมแนบตัวแปร period ไปกรองข้อมูล
      window.open(`/api/reports/export-excel?period=${filterPeriod}`, '_blank');
      
      setTimeout(() => {
        toast.success('ดาวน์โหลดไฟล์รายงานสำเร็จ!', { id: toastId });
      }, 1000);
    } catch (error) {
      toast.error('ส่งออก Excel ล้มเหลว', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* 🌟 ย้ายแจ้งเตือนมาไว้ตรงกลาง (top-center) เพื่อไม่ให้ล้นขอบจอ */}
      <Toaster position="top-center" />

      {/* --- ส่วนหัว Header แถวบนสุด --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-4 sm:px-6 py-4 bg-white border-b border-slate-200 shadow-sm gap-4 sticky top-0 z-20 w-full">
        {/* ฝั่งซ้าย: ปุ่มย้อนกลับ และ ชื่อหัวข้อหน้า */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-1.5 text-slate-500 hover:text-blue-600 font-semibold transition-colors bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-xs sm:text-sm shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline">กลับหน้าหลัก</span>
            <span className="inline sm:hidden">กลับ</span>
          </button>
          <div className="truncate">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              รายงานผลยอดขาย
            </h1>
          </div>
        </div>

        {/* 🌟 ฝั่งขวา: ปรับ flex-wrap เพื่อให้ปุ่มตกลงมาบรรทัดใหม่ถ้ายาวเกินจอมือถือ */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end pb-1 lg:pb-0">
          {/* 1. Dropdown เลือกช่วงเวลา */}
          <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shrink-0 h-10 flex-1 sm:flex-none"
          >
            <option value="today">วันนี้</option>
            <option value="7days">7 วันล่าสุด</option>
            <option value="month">เดือนนี้</option>
            <option value="year">ปีนี้</option>
          </select>

          {/* 2. ปุ่มประวัติใบเสร็จ */}
          <button 
            onClick={() => navigate('/ManageSales')} 
            className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap shrink-0 h-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            ประวัติใบเสร็จ
          </button>

          {/* 3. ปุ่มส่งออกเป็นไฟล์ Excel */}
          <button 
            onClick={handleExportExcel}
            className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap shrink-0 h-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3m-6 9h3m-3 3h6" />
            </svg>
            ส่งออก Excel
          </button>
        </div>
      </div>

      {/* --- Main Content โซนเนื้อหาแดชบอร์ด --- */}
      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-medium gap-2">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>กำลังคำนวณและประมวลผลข้อมูลสถิติ...</span>
          </div>
        ) : (
          <>
            {/* KPI Cards สรุปตัวเลข */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ยอดขายรวม</p>
                <h3 className="text-lg sm:text-2xl font-mono font-black text-slate-800 mt-1">฿{Number(summary.totalSales).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">จำนวนบิลสุทธิ</p>
                <h3 className="text-lg sm:text-2xl font-mono font-black text-slate-800 mt-1">{summary.totalOrders} บิล</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">เฉลี่ยต่อบิล</p>
                <h3 className="text-lg sm:text-2xl font-mono font-black text-slate-800 mt-1">฿{Number(summary.avgOrderValue).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">จำนวนชิ้นที่จำหน่าย</p>
                <h3 className="text-lg sm:text-2xl font-mono font-black text-slate-800 mt-1">{summary.itemsSold} ชิ้น</h3>
              </div>
            </div>

            {/* โซนวาดกราฟ SVG ดึงยอดจากฐานข้อมูล */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-4">กราฟแสดงมูลค่าสถิติยอดขายตามช่วงเวลา</h3>
                <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-end justify-between h-56 pt-8">
                  {chartData.length === 0 ? (
                    <div className="w-full text-center text-xs text-slate-400 py-10">ไม่มีข้อมูลธุรกรรมในช่วงเวลานี้</div>
                  ) : (
                    chartData.map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center flex-1 group relative">
                        <span className="text-[9px] font-mono font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800  px-1.5 py-0.5 rounded absolute -top-7 shadow-sm z-10 whitespace-nowrap">฿{Number(item.revenue).toLocaleString()}</span>
                        <div style={{ height: `${item.percent}%` }} className="w-6 sm:w-12 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-md hover:from-blue-600 hover:to-cyan-500 shadow-sm transition-all duration-500 cursor-pointer"></div>
                        <span className="text-[10px] font-bold text-slate-400 mt-2 truncate max-w-[60px] sm:max-w-none">{item.label}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* อันดับ 3 สินค้าขายดีที่สุด */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
              <div className="p-4 sm:p-5 border-b border-slate-100">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">อันดับ 3 สินค้าขายดีที่สุด</h3>
                <p className="text-[11px] text-slate-400">รายการสินค้าที่ทำยอดจำนวนชิ้นได้สูงที่สุด</p>
              </div>
              <div className="divide-y divide-slate-100">
                {topProducts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">ยังไม่มีข้อมูลอันดับสินค้าขายดี</div>
                ) : (
                  topProducts.map((product, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                      <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-black text-xs shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' : idx === 1 ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-300' : 'bg-orange-100 text-orange-700 ring-2 ring-orange-200'}`}>{idx + 1}</div>
                        <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          {product.image ? (
                            <img src={`/uploads/${product.image}`} className="w-full h-full object-contain" alt="Product" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-5 h-5 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight truncate">{product.product_name}</h4>
                        </div>
                      </div>
                      <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 font-mono text-xs text-right">
                        <div>
                          <span className="text-slate-400 sm:hidden text-[11px] font-sans">ขายได้: </span>
                          <span className="font-extrabold text-slate-700 text-sm">{product.sold_qty}</span> <span className="font-sans text-slate-500">({product.unit})</span>
                        </div>
                        <div className="sm:mt-0.5">
                          <span className="text-slate-400 sm:hidden text-[11px] font-sans">รวมรายได้: </span>
                          <span className="font-bold text-emerald-600">฿{Number(product.revenue).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SalesReport;