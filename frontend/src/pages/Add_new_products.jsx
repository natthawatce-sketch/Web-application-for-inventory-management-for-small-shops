import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

function Add_new_products() {
  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [imageFile, setImageFile] = useState(null); 
  const [categories, setCategories] = useState([]); // สำหรับเก็บหมวดหมู่จากหลังบ้าน
  const navigate = useNavigate();

  // รวม useEffect สำหรับดึงหมวดหมู่สินค้า และตั้งค่าสแกนเนอร์
  useEffect(() => {
    // 1. ดึงข้อมูลหมวดหมู่สินค้าจาก Backend
    const fetchCategories = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/categories");
        const data = await response.json();
        setCategories(data); // เอาข้อมูลที่ได้ไปเก็บใน state categories
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงหมวดหมู่:", error);
      }
    };

    fetchCategories();

    // 2. เรียกใช้งานเครื่องสแกนบาร์โค้ด
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { 
        fps: 20, 
        qrbox: { width: 300, height: 100 }, 
        aspectRatio: 2.5, 
        disableFlip: false 
      },
      false
    );

    const onScanSuccess = (decodedText) => {
      setBarcode(decodedText);
    };

    const onScanFailure = (error) => {};

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, []);

  // ฟังก์ชันส่งข้อมูล (FormData)
  const handleSaveProduct = async () => {
    if (!productName || !categoryId || !barcode || !price || !unit) {
      alert("กรุณากรอกข้อมูลสินค้าให้ครบถ้วนครับ!");
      return;
    }

    const formData = new FormData();
    formData.append("product_name", productName);
    formData.append("category_id", categoryId);
    formData.append("barcode", barcode);
    formData.append("unit", unit);
    formData.append("price", price);
    
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const response = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        body: formData, 
      });

      const data = await response.json();

      if (response.ok) {
        alert("🎉 เพิ่มสินค้าสำเร็จ!");
        setBarcode(""); 
        setProductName(""); 
        setCategoryId(""); 
        setPrice(""); 
        setUnit(""); 
        setImageFile(null); 
      } else {
        alert("เกิดข้อผิดพลาด: " + data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white ">
      <div className='flex items-center bg-blue-900 h-16 w-auto   '>
        <div className='w-1/2'>
          {/* ซ้าย: ปุ่มย้อนกลับ */}
        <div className="m-5 flex-1 flex justify-start">
            <button 
            onClick={() => navigate('/ManageProducts')}
            className="flex items-center gap-1.5 sm:gap-2 text-slate-500 hover:text-blue-600 font-semibold transition-colors bg-slate-50 px-3 sm:px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-xs sm:text-sm whitespace-nowrap"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline">กลับหน้าหลัก</span>
            <span className="inline sm:hidden">กลับ</span>
            </button>
        </div>
        </div>
        <div className='px-auto py-2 flex w-2/3 items-center xl:pl-10'>
          <p className=' text-white text-lg py-2'>เพิ่มสินค้าใหม่</p>
        </div>
      </div>  

      <div className='flex justify-center my-3 mx-10 xl:mx-72'>
        <div id="reader" className="w-full max-w-sm rounded-md overflow-hidden border-2 border-gray-300"></div>
      </div>

      <div className='mx-10 xl:mx-72'>
        <p className='text-center text-gray-500 mb-2'>- - - หรือกรอกบาร์โค้ดเอง - - -</p>
        <input 
          type="text" 
          value={barcode} 
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="คลิกสแกนด้านบน หรือ พิมพ์เลขบาร์โค้ดที่นี่"
          className="border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
        />
        
        <div className="w-full my-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพสินค้า</label>
          <input 
            type="file" 
            accept="image/png, image/jpeg"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </div>

        <p className=' my-2'>ชื่อสินค้า</p>
        <input 
          type="text" 
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="mb-3 border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
        />
        
        {/* ส่วนที่แก้ไข: ดึงข้อมูลหมวดหมู่แบบ Dynamic มาแสดงผล */}
        <select 
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="border-2 border-gray-300 rounded-md p-2 w-full outline-none focus:border-blue-500"
        >
          <option value="">เลือกประเภทสินค้า</option>
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.category_name}
            </option>
          ))}
        </select>
      </div>

      <div className='mx-10 my-3 flex gap-5 xl:mx-72'>
        <div className='flex-1'>
          <p className='mb-2'>ราคา</p>
          <input 
            type="number" 
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
          />
        </div>
        <div className='flex-1'>
          <p className='mb-2'>ลักษณะนาม</p>
          <input 
            type="text" 
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="เช่น ขวด, ถุง, ชิ้น"
            className="border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
          />
        </div>
      </div>
      
      <div className=' my-5 flex justify-center mx-10 xl:mx-72'>
        <button 
          type="button" 
          onClick={handleSaveProduct}
          className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-8 rounded-md transition-colors'
        >
          บันทึกข้อมูล
        </button>
      </div>
    </div>
  )
}

export default Add_new_products;