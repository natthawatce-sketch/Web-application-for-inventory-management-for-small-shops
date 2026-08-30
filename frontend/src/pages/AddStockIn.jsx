import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

// 🌟 Import Component BarcodeScanner เข้ามา (อย่าลืมเช็ค Path โฟลเดอร์ให้ตรงนะครับ)
import BarcodeScanner from '../components/BarcodeScanner';

function AddStockIn() {
  const navigate = useNavigate();
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [formData, setFormData] = useState({
    quantity: '',
    cost_price: '',
    expiration_date: ''
  });

  const lastScannedRef = useRef(null);

  // 🔍 ฟังก์ชันดึงข้อมูลจาก Database ด้วยบาร์โค้ด
  const fetchProductByBarcode = async (scannedBarcode) => {
    if (!scannedBarcode) {
      toast.error('กรุณากรอกรหัสบาร์โค้ด');
      return;
    }

    // 🌟 ดักทางช่องว่าง (Spacebar) ที่แอบซ่อนมา
    const cleanBarcode = scannedBarcode.toString().trim();
    const toastId = toast.loading('กำลังค้นหาข้อมูล...');
    
    try {
      const response = await fetch(`/api/products/barcode/${cleanBarcode}`);

      if (response.ok) {
        const data = await response.json();
        const productData = Array.isArray(data) ? data[0] : data;

        if (productData && productData.product_id) {
          setProductInfo(productData);
          
          // ✨ เพิ่มเติม: เคลียร์ฟอร์มกรอกข้อมูลทิ้ง ป้องกันกรณีสแกนเปลี่ยนสินค้าแล้วจำนวนของเก่าค้าง
          setFormData({ quantity: '', cost_price: '', expiration_date: '' });
          
          toast.success('ดึงข้อมูลสินค้าสำเร็จ!', { id: toastId });
        } else {
          setProductInfo(null);
          toast.error('ข้อมูลที่ได้มา ไม่สมบูรณ์', { id: toastId });
        }
      } else {
        setProductInfo(null);
        setFormData({ quantity: '', cost_price: '', expiration_date: '' });
        toast.error('ไม่พบสินค้ารหัสนี้ในระบบ', { id: toastId });
      }
    } catch (error) {
      console.error("🚨 Error การยิง Fetch:", error);
      toast.error('ระบบเชื่อมต่อล้มเหลว (เช็ค Backend)', { id: toastId });
    }
  };

  // 📸 ฟังก์ชันรับค่าจาก BarcodeScanner Component
  const handleScanSuccess = (decodedText) => {
    if (decodedText !== lastScannedRef.current) {
      lastScannedRef.current = decodedText;
      setBarcodeInput(decodedText);
      fetchProductByBarcode(decodedText); // สแกนเจอปุ๊บ ดึงข้อมูลโชว์ทันที
    }
  };

  // 📝 จัดการการพิมพ์ช่องรับสินค้า
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔎 ค้นหาแบบพิมพ์ตัวเลขเองแล้วกด Enter / ปุ่มค้นหา
  const handleManualSearch = () => {
    lastScannedRef.current = barcodeInput;
    fetchProductByBarcode(barcodeInput);
  };

  // 💾 บันทึกข้อมูลเข้าสต็อก
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productInfo) {
      toast.error('กรุณาสแกนหรือค้นหาสินค้าให้พบก่อนบันทึก');
      return;
    }

    const toastId = toast.loading('กำลังบันทึกข้อมูล...');
    const userId = localStorage.getItem('user_id') || 1;

    const dataToSend = {
      product_id: productInfo.product_id,
      quantity: formData.quantity,
      cost_price: formData.cost_price,
      expiration_date: formData.expiration_date || null,
      user_id: userId
    };

    try {
      const response = await fetch(`/api/stock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        toast.success('เพิ่มเข้าสต็อกเรียบร้อย!', { id: toastId });
        // เคลียร์ทุกอย่างเตรียมยิงตัวต่อไป
        setBarcodeInput('');
        setProductInfo(null);
        setFormData({ quantity: '', cost_price: '', expiration_date: '' });
        lastScannedRef.current = null;
      } else {
        toast.error('บันทึกไม่สำเร็จ ตรวจสอบข้อมูลอีกครั้ง', { id: toastId });
      }
    } catch (error) {
      toast.error('หลังบ้านเกิดข้อผิดพลาด', { id: toastId });
    }
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      <Toaster position="top-center" />

      {/* --- Header --- */}
      <div className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <button onClick={() => navigate('/ManageStockIn')} className="flex items-center gap-1.5 sm:gap-2 text-slate-500 hover:text-blue-600 font-semibold transition-colors bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-slate-200 shadow-sm text-xs sm:text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          <span className="hidden sm:inline">กลับหน้าหลัก</span>
          <span className="inline sm:hidden">กลับ</span>
        </button>
        <h1 className="text-base sm:text-xl font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          รับสินค้าเข้าสต็อก
        </h1>
        <div className="w-16 sm:w-20"></div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 sm:gap-4 h-full">
          
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 shrink-0">
            
            {/* 1. กล่องสแกนกล้อง */}
            <div className="w-full lg:w-5/12 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-2 sm:p-3 flex flex-col gap-2 sm:gap-3">
              
              {/* 🌟 BarcodeScanner */}
              <div className="w-full relative rounded-xl overflow-hidden bg-white flex-shrink-0">
                 <BarcodeScanner onScanSuccess={handleScanSuccess} />
              </div>
              
              {/* ช่องค้นหา Manual */}
              <div className="flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={barcodeInput} 
                  onChange={(e) => setBarcodeInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()} 
                  placeholder="สแกน หรือพิมพ์รหัส..." 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none text-xs sm:text-sm font-mono"
                />
                <button onClick={handleManualSearch} className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 whitespace-nowrap">
                  ค้นหา
                </button>
              </div>
            </div>

            {/* 2. กล่องแสดงข้อมูลสินค้ารวม */}
            <div className={`w-full lg:w-7/12 rounded-xl sm:rounded-2xl border-2 flex flex-col transition-all duration-300 p-3 sm:p-4 ${productInfo ? 'bg-white border-blue-300 shadow-md' : 'bg-slate-50 border-dashed border-slate-300'}`}>
              <h3 className="text-xs sm:text-sm font-bold text-slate-500 mb-2 sm:mb-3 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                ข้อมูลสินค้า
              </h3>

              <div className="flex flex-row gap-3 sm:gap-5 items-center flex-1">
                {/* 📸 รูปภาพเล็กๆ ด้านซ้าย */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center p-1 shadow-sm">
                  {productInfo && productInfo.image ? (
                    <img src={(productInfo.image?.startsWith('http') ? productInfo.image : `/uploads/${productInfo.image}`)} className="w-full h-full object-contain" alt="Product" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  )}
                </div>

                {/* 📝 รายละเอียดด้านขวา */}
                <div className="flex-1 flex flex-col justify-center space-y-2 sm:space-y-4 overflow-hidden">
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mb-0.5 sm:mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 sm:w-3.5 sm:h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                      รหัสบาร์โค้ด
                    </div>
                    {productInfo ? (
                      <div className="text-base sm:text-lg lg:text-xl font-mono font-bold text-slate-800 bg-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-100 inline-block shadow-sm truncate max-w-full">{productInfo.barcode}</div>
                    ) : (
                      <div className="text-slate-400 font-mono text-sm sm:text-base">- - - - -</div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mb-0.5 sm:mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 sm:w-3.5 sm:h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
                      ชื่อสินค้า
                    </div>
                    {productInfo ? (
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-sm sm:text-base lg:text-lg font-bold text-blue-700 leading-tight truncate max-w-full">{productInfo.product_name}</span>
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold whitespace-nowrap">({productInfo.unit})</span>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs sm:text-sm">รอสแกนสินค้า...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* โซนล่าง: ฟอร์มกรอกจำนวน */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-5 relative shrink-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-xl sm:rounded-t-2xl"></div>
            
            <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              ข้อมูลรับเข้าสต็อก
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
              <div className="lg:col-span-1">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-600 mb-1">จำนวนรับเข้า <span className="text-red-500">*</span></label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} disabled={!productInfo} required min="1" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 text-slate-800 font-bold text-sm" placeholder="ระบุจำนวน" />
              </div>
              
              <div className="lg:col-span-1">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-600 mb-1">ต้นทุน/ชิ้น <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">฿</span>
                  <input type="number" step="0.01" name="cost_price" value={formData.cost_price} onChange={handleInputChange} disabled={!productInfo} required min="0" className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-2 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 text-slate-800 font-bold text-sm" placeholder="0.00" />
                </div>
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-600 mb-1">วันหมดอายุ (ถ้ามี)</label>
                <input type="date" name="expiration_date" value={formData.expiration_date} onChange={handleInputChange} disabled={!productInfo} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 sm:px-3 py-2 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 text-slate-800 font-bold text-sm" />
              </div>

              <div className="sm:col-span-3 lg:col-span-1 flex items-end mt-1 sm:mt-2  lg:mt-0 ml-8 mr-8">
                <button type="submit" disabled={!productInfo} className="w-full h-10 sm:h-[38px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 flex justify-center items-center gap-1.5 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  บันทึกสต็อก
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AddStockIn;