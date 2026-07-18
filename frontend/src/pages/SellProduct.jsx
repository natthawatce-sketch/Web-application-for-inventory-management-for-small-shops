import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import BarcodeScanner from '../components/BarcodeScanner';

function SellProduct() {
  const navigate = useNavigate();
  
  // States สำหรับจัดการสินค้าและตะกร้า
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState([]);
  
  // States สำหรับควบคุม UI ป๊อปอัป
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'cash' หรือ 'qr'
  
  const lastScannedRef = useRef(null);
  const searchInputRef = useRef(null);

  // Auto-focus ช่องค้นหาเวลากดเปิดป๊อปอัปค้นหา
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // 🔍 ค้นหาและเพิ่มลงตะกร้าสินค้า
  const fetchProductAndAddToCart = async (scannedBarcode) => {
    if (!scannedBarcode) return;
    const cleanBarcode = scannedBarcode.toString().trim();
    
    // หากมีสินค้าในตะกร้าอยู่แล้วให้บวกเพิ่มจำนวน
    const existingItem = cart.find(item => item.barcode === cleanBarcode);
    if (existingItem) {
      // 🌟 เช็คว่าจำนวนที่กำลังจะบวกเพิ่ม เกินสต็อกที่มีหรือไม่
      if (existingItem.quantity >= existingItem.max_stock) {
        toast.error(`สินค้าหมด! (ในสต็อกมีแค่ ${existingItem.max_stock} ชิ้น)`);
        setBarcodeInput('');
        setIsSearchOpen(false);
        return;
      }

      setCart(cart.map(item => 
        item.barcode === cleanBarcode ? { ...item, quantity: (parseInt(item.quantity) || 0) + 1 } : item
      ));
      toast.success(`เพิ่มจำนวน ${existingItem.product_name}`);
      setBarcodeInput('');
      setIsSearchOpen(false);
      return;
    }

    const toastId = toast.loading('กำลังตรวจสอบสินค้า...');
    try {
      const response = await fetch(`/api/products/barcode/${cleanBarcode}`);
      if (response.ok) {
        const data = await response.json();
        const productData = Array.isArray(data) ? data[0] : data;
        
        // 🌟 บังคับแปลงค่าที่ได้จากฐานข้อมูลให้เป็น "ตัวเลข" เสมอ ป้องกันการเทียบค่าผิดพลาด
        const availableStock = parseInt(productData.quantity || productData.stock || 0);

        // 🌟 ถ้ายิงบาร์โค้ดครั้งแรกแล้วพบว่าสต็อกเป็น 0 ให้บล็อกทันที
        if (availableStock <= 0) {
          toast.error('สินค้านี้สต็อกหมดแล้ว!', { id: toastId });
          setBarcodeInput('');
          setIsSearchOpen(false);
          return;
        }

        // 🌟 แนบ max_stock เข้าไปในตะกร้าด้วย เพื่อใช้เช็คขีดจำกัด
        setCart(prev => [{ ...productData, quantity: 1, max_stock: availableStock }, ...prev]);
        toast.success('เพิ่มลงตะกร้าแล้ว', { id: toastId });
        setBarcodeInput('');
        setIsSearchOpen(false);
      } else {
        toast.error('ไม่พบสินค้านี้ในระบบ', { id: toastId });
      }
    } catch (error) {
      toast.error('เชื่อมต่อระบบล้มเหลว', { id: toastId });
    }
  };

  // 📸 กล้องสแกนทำงานแบบ Always On ค้างไว้ตลอดเวลา
  const handleScanSuccess = (decodedText) => {
    if (decodedText !== lastScannedRef.current) {
      lastScannedRef.current = decodedText;
      fetchProductAndAddToCart(decodedText);
      setTimeout(() => { lastScannedRef.current = null; }, 1500); 
    }
  };

  // 🌟 ฟังก์ชันปรับปรุงจำนวน (อนุญาตให้พิมพ์ลบจนช่องว่างได้ และดักจับไม่ให้เกินสต็อก)
  const updateQuantity = (productId, newQty) => {
    if (newQty === '') {
      setCart(cart.map(item => item.product_id === productId ? { ...item, quantity: '' } : item));
      return;
    }
    const parsedQty = parseInt(newQty);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      setCart(cart.map(item => {
        if (item.product_id === productId) {
          // 🌟 เช็คว่าเลขที่พิมพ์/กดเพิ่ม เข้ามาเกินสต็อกหรือไม่
          if (parsedQty > item.max_stock) {
            toast.error(`ใส่ได้สูงสุดแค่ ${item.max_stock} ชิ้นเท่านั้น`);
            // บังคับเปลี่ยนเลขกลับเป็นจำนวนสต็อกสูงสุดที่มี
            return { ...item, quantity: item.max_stock }; 
          }
          return { ...item, quantity: parsedQty };
        }
        return item;
      }));
    }
  };

  const removeProduct = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  // 🌟 ป้องกันคำนวณ Error หากเผลอลบตัวเลขทิ้งจนเป็นค่าว่าง ('')
  const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * (parseInt(item.quantity) || 0)), 0);

  // 💾 บันทึกการขายและตัดสต็อก
  const handleProcessSale = async () => {
    // ป้องกันการกดยืนยันถ้ามีสินค้าที่ quantity เป็นค่าว่าง
    const invalidItems = cart.some(item => !item.quantity || item.quantity < 1);
    if (invalidItems) {
      toast.error('กรุณาระบุจำนวนสินค้าให้ถูกต้อง');
      return;
    }

    const toastId = toast.loading('กำลังบันทึกข้อมูล...');
    const userId = localStorage.getItem('user_id') || 1;

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          total_price: totalPrice,
          payment_method: paymentMethod,
          cart_items: cart
        })
      });

      if (response.ok) {
        toast.success('บันทึกการขายเสร็จสิ้น!', { id: toastId });
        setCart([]);
        setIsPaymentModalOpen(false);
        setPaymentMethod('');
      } else {
        toast.error('เกิดข้อผิดพลาดในการขาย', { id: toastId });
      }
    } catch (error) {
      toast.error('เซิร์ฟเวอร์ขัดข้อง', { id: toastId });
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <Toaster position="top-center" />

      {/* --- ส่วนหัวแถบ Navbar --- */}
      <div className="h-14 flex items-center justify-between px-3 bg-white border-b border-slate-200 shadow-sm shrink-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-slate-500 hover:text-blue-600 bg-slate-100 p-1.5 rounded-lg active:scale-95 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
          ขายสินค้า
        </h1>
        
        {/* ปุ่มกดเปิดพิมพ์ค้นหาบาร์โค้ด */}
        <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-1.5 rounded-lg active:scale-95 shadow-sm transition-all ${isSearchOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        </button>
      </div>

      {/* ช่องพิมพ์ค้นหา (ย่อขนาดให้กระทัดรัดขึ้น) */}
      {isSearchOpen && (
        <div className="absolute top-14 left-0 w-full bg-white border-b shadow-md p-2.5 z-20 flex gap-1.5 animate-fade-in-up">
          <input 
            ref={searchInputRef}
            type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && fetchProductAndAddToCart(barcodeInput)} 
            placeholder="กรอกรหัสบาร์โค้ด..." 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 focus:bg-white font-mono text-xs font-bold transition-all"
          />
          <button onClick={() => fetchProductAndAddToCart(barcodeInput)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95">ค้นหา</button>
        </div>
      )}

      {/* 📸 กล่องวิดีโอตัวจับสแกนกล้อง (ปรับความสูงและความกว้างให้พอดี) */}
      <div className="bg-slate-900 px-3 py-2 shrink-0 border-b border-slate-800 shadow-inner flex justify-center">
        <div className="w-full max-w-[280px] rounded-xl overflow-hidden border-2 border-slate-700/50 relative">
          <BarcodeScanner onScanSuccess={handleScanSuccess} />
          {/* ขีดเลเซอร์จำลองเพื่อความสวยงาม */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none"></div>
        </div>
      </div>

      {/* --- ส่วนรายการตะกร้าของแคชเชียร์ --- */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 pb-24 bg-slate-50">
        {cart.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold pt-12 gap-1.5 opacity-60">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18M2.25 13.5l1.326-5.305A2.25 2.25 0 015.77 6.75h12.46a2.25 2.25 0 012.194 1.445L21.75 13.5m-18 0a2.25 2.25 0 00-2.25 2.25v3a2.25 2.25 0 002.25 2.25h19.5a2.25 2.25 0 002.25-2.25v-3a2.25 2.25 0 00-2.25-2.25M9.75 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" /></svg>
             ว่างเปล่า.. สแกนสินค้าเลย!
           </div>
        ) : (
          cart.map((item, index) => (
            <div key={index} className="flex items-center bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 gap-2.5 hover:border-blue-100 transition-colors">
              <img src={`/uploads/${item.image}`} className="w-11 h-11 object-contain rounded-lg bg-slate-50 border border-slate-100 p-0.5" alt="Product" />
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 text-[13px] truncate leading-tight mb-0.5">{item.product_name}</h4>
                <p className="font-extrabold text-blue-600 text-[11px]">฿{parseFloat(item.price).toFixed(2)}</p>
                
                {/* กลุ่มปุ่มแคปซูลขนาดเล็กกะทัดรัด */}
                <div className="flex items-center gap-1 mt-1 bg-slate-50 w-fit rounded-md p-0.5 border border-slate-200">
                  <button onClick={() => updateQuantity(item.product_id, (parseInt(item.quantity) || 0) - 1)} className="w-5 h-5 flex items-center justify-center bg-white rounded shadow-sm text-slate-700 text-xs font-bold active:bg-slate-100">-</button>
                  <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.product_id, e.target.value)} className="w-7 text-center bg-transparent text-xs font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" min="1" />
                  <button onClick={() => updateQuantity(item.product_id, (parseInt(item.quantity) || 0) + 1)} className="w-5 h-5 flex items-center justify-center bg-white rounded shadow-sm text-slate-700 text-xs font-bold active:bg-slate-100">+</button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <button onClick={() => removeProduct(item.product_id)} className="p-1 text-slate-300 hover:text-red-500 rounded-md transition-colors active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="font-black text-slate-800 text-sm font-mono mt-1">฿{(item.price * (parseInt(item.quantity) || 0)).toFixed(2)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- แถบปุ่มชำระเงินด้านล่าง (ลดความสูงลง) --- */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 px-3 py-2.5 shadow-[0_-4px_6px_rgba(0,0,0,0.02)] z-10">
        <div className="flex justify-between items-end mb-2 px-1">
          <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wide">รวมทั้งหมด {totalItems} รายการ</span>
          <span className="text-2xl font-black text-green-600 font-mono leading-none">฿{totalPrice.toFixed(2)}</span>
        </div>
        <button 
          onClick={() => setIsPaymentModalOpen(true)} 
          disabled={cart.length === 0} 
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-[13px] uppercase tracking-wider rounded-lg shadow-sm transition-all active:scale-[0.98]"
        >
          ชำระเงิน
        </button>
      </div>

      {/* 💰 Modal เลือกวิธีชำระเงิน (ดีไซน์ใหม่) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-3 animate-fade-in-up">
            
            {/* หัวข้อสรุปใบเสร็จ */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                <span className="font-bold text-slate-500 text-[11px] flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.75 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  สรุปยอดชำระ
                </span>
              </div>
              <div className="text-[11px] space-y-1 text-slate-600 max-h-40 overflow-y-auto pr-1 font-mono">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="truncate max-w-[65%]">{item.product_name}</span>
                    <span>x{item.quantity} <span className="font-bold text-slate-800 ml-1">฿{(item.price * (parseInt(item.quantity) || 0)).toFixed(2)}</span></span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-1.5 border-t border-dashed border-slate-300 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">ยอดรวมสุทธิ</span>
                <span className="text-xl font-black text-green-600 font-mono">฿{totalPrice.toFixed(2)}</span>
              </div>
            </div>
            
            {/* ปุ่มเลือกวิธีชำระเงิน (กะทัดรัดขึ้น) */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentMethod('cash')} className={`py-2 px-1 border-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <span className="text-lg">💵</span> 
                <span>เงินสด</span>
              </button>
              <button onClick={() => setPaymentMethod('qr')} className={`py-2 px-1 border-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${paymentMethod === 'qr' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <span className="text-lg">📱</span> 
                <span>สแกนโอน</span>
              </button>
            </div>

            {/* 🌟 โชว์ QR Code รับเงิน (ถ้าเลือกโอน) */}
            {paymentMethod === 'qr' && (
              <div className="w-full h-32 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 text-center animate-fade-in-up shadow-sm">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" 
                  alt="QR Code" 
                  className="h-20 w-20 object-contain mb-1"
                />
                <span className="text-blue-600 font-bold text-[10px] uppercase tracking-wide">สแกนเพื่อชำระเงิน</span>
              </div>
            )}

            {/* กลุ่มปุ่มกดยืนยัน (กระชับและบางลง) */}
            <div className="flex gap-2 mt-1">
              <button onClick={() => { setIsPaymentModalOpen(false); setPaymentMethod(''); }} className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs transition-colors active:scale-95">ยกเลิก</button>
              
              <button 
                onClick={handleProcessSale} 
                disabled={!paymentMethod} 
                className="w-2/3 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-bold text-xs transition-colors active:scale-95 disabled:cursor-not-allowed shadow-sm"
              >
                ยืนยันการขาย
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

export default SellProduct;