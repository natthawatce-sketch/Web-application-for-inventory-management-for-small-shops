import React from 'react'

function Edit_Product() {
  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <div className='flex items-center bg-blue-900 h-16 w-auto '>
        <div className='w-1/2'>
        </div>
        <div className='px-auto py-2 flex w-2/3 items-center xl:pl-10'>
          <p className=' text-white text-lg py-2'>แก้ไขข้อมูลสินค้า</p>
        </div>
      </div> 
        <div className='border-2 shadow-lg shadow-black/50 mt-5 p-5 mx-72 rounded-md'>
          <div className='mx-10 xl:mx-2 border-2 border-red-600 flex '>
            <div className='border-2 border-blue-950 h-40 w-1/2'>
                
            </div>
            <div className='border-2 border-blue-500 h-40 w-1/2'>
            
            </div>
        </div>
        <div className='mx-10 xl:mx-2 border-2 border-orange-500'>
        <p className=' my-2'>เลขบาร์โค้ด</p>
        <input 
          type="text" 
          className="border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
        />
        </div>

        <div className="mx-10  gap-5 xl:mx-2 border-2 border-green-400 ">
          <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพสินค้า</label>
          <input 
            type="file" 
            accept="image/png, image/jpeg"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </div>

        <div className='mx-10 flex gap-5 xl:mx-2 border-2 border-green-400'>
            <div className='flex-1'>
            <p className='mb-2'>ชื่อสินค้า</p>
            <input 
                type="text" 
                className="border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
            />
            </div>
            <div className='flex-1'>
            <p className='mb-2'>สถาณะสินค้า</p>
            <input 
                type="text" 
                className="border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
            />
            </div>
      </div>

        <div className='mx-10 flex gap-5 xl:mx-2 border-2 border-green-400'>
            <div className='flex-1'>
            <p className='mb-2'>ราคา</p>
            <input 
                type="number" 
                className="border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
            />
            </div>
            <div className='flex-1'>
            <p className='mb-2'>ลักษณะนาม</p>
            <input 
                type="text" 
                className="border-2 border-gray-300 rounded-md p-2 w-full focus:border-blue-500 outline-none"
            />
            </div>
      </div>

      <div className='mx-10 my-2 gap-5 xl:mx-2 border-2 border-purple-800 flex items-center justify-center'>
            <button className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-36 rounded-md transition-colors '
            >ลบสินค้า</button>
            
      </div>
         <div className='mx-10 my-2 flex gap-2 xl:mx-2 border-2 border-blue-400 items-center justify-center'>
            <button className='bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-2 px-16 rounded-md transition-colors'
            >ยกเลิก</button>
            <button className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-10 rounded-md transition-colors'
            >บันทึกข้อมูล</button>
      </div>
        </div>


    </div>
    )
}

export default Edit_Product