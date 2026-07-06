import React, { useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

function BarcodeScanner({ onScanSuccess }) {
  useEffect(() => {
    // กำหนดค่าเครื่องสแกนเหมือนเดิม
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 }, 
        disableFlip: false,
        useBarCodeDetectorIfSupported: true, // เปิดใช้ระบบ Image Processing ของมือถือ (ถ้ามี)
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          advanced: [{ focusMode: "continuous" }]
        }
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