import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

function BarcodeScanner({ onScanSuccess }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let controls = null;
    
    // ตั้งค่าให้สแกนเฉพาะ Barcode (1D) เท่านั้น ไม่เอา QR Code
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39
    ]);

    const codeReader = new BrowserMultiFormatReader(hints);

    codeReader
      .decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
        },
        videoRef.current,
        (result, err) => {
          if (result) {
            if (onScanSuccess) {
              onScanSuccess(result.getText());
            }
          }
          if (err && err.name !== 'NotFoundException') {
            // Uncomment to debug errors other than not finding a barcode
            // console.error(err);
          }
        }
      )
      .then((c) => {
        controls = c;
      })
      .catch((err) => {
        console.error(err);
        setError('ไม่สามารถเปิดกล้องได้: ' + err.message);
      });

    return () => {
      if (controls) {
        controls.stop();
      }
    };
  }, [onScanSuccess]);

  return (
    <div className='flex flex-col items-center justify-center my-3 w-full'>
      {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}
      <div className="relative w-full max-w-sm rounded-md overflow-hidden border-2 border-gray-300 bg-black">
        <video ref={videoRef} className="w-full h-auto object-cover" style={{ minHeight: '200px' }} />
        {/* กรอบเล็งบาร์โค้ด */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div className="w-[80%] h-[120px] border-2 border-red-500 relative bg-black/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* เส้นสแกนสีแดงวิ่ง */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 opacity-80 shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
           </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">โปรดวางเส้นสีแดงให้ตรงกับบาร์โค้ด</p>
    </div>
  );
}

export default BarcodeScanner;