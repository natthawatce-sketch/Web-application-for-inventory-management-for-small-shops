import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

function BarcodeScanner({ onScanSuccess }) {
  useEffect(() => {
    // กำหนดค่าเครื่องสแกนเหมือนเดิม
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { 
        fps: 10, 
        qrbox: { width: 250, height: 100 }, 
        disableFlip: false 
      },
      false
    );

    // ฟังก์ชันเมื่อสแกนสำเร็จ
    const handleScanSuccess = (decodedText) => {
      // ส่งค่าที่สแกนได้กลับไปให้ Component แม่
      if (onScanSuccess) {
        onScanSuccess(decodedText);
      }
    };

    const handleScanFailure = (error) => {
      // สามารถเพิ่มการจัดการ error ได้ถ้าต้องการ
    };

    // เริ่มทำงาน
    scanner.render(handleScanSuccess, handleScanFailure);

    // Cleanup function เมื่อออกจากหน้านั้นๆ (สำคัญมาก ป้องกันกล้องค้าง)
    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [onScanSuccess]);

  return (
    <div className='flex justify-center my-3'>
      {/* โครงสร้าง UI สำหรับตัวสแกน เหมือนที่คุณตั้งค่าไว้ */}
      <div id="reader" className="w-full max-w-sm rounded-md overflow-hidden border-2 border-gray-200"></div>
    </div>
  );
}

export default BarcodeScanner;