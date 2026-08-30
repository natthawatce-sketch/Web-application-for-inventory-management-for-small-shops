import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const ManageProducts = () => {
  const navigate = useNavigate();

  // --- สิทธิ์ผู้ใช้งาน ---
  const userRole = localStorage.getItem('user_role');
  const isAdmin = userRole?.toLowerCase() === 'admin';

  // --- States ข้อมูล ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Filters ---
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(4); 
      } else {
        setItemsPerPage(5); 
      }
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Modals States ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- Form Data ---
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    product_name: '',
    barcode: '',
    category_id: '',
    price: '',
    unit: '',
    product_status: 'พร้อมขาย',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);

  // --- Fetch Data ---
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // --- ระบบกรองและค้นหา ---
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.includes(searchQuery);

    const matchesCategory = filterCategory === '' || String(product.category_id) === filterCategory;

    const currentStatus = product.product_status || 'พร้อมขาย';
    const matchesStatus = filterStatus === '' || currentStatus === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterStatus]);

  // --- คำนวณ Pagination ---
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  // --- Handlers ---
  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setFormData({
      product_name: product.product_name || '',
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      price: product.price || '',
      unit: product.unit || 'ชิ้น',
      product_status: product.product_status || 'พร้อมขาย',
    });
    setImagePreview(product.image ? (product.image?.startsWith('http') ? product.image : `/uploads/${product.image}`) : null);
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    setIsConfirmModalOpen(true);
  };

  // 🌟 ฟังก์ชันอัปเดตข้อมูลแบบสมบูรณ์
  const handleConfirmUpdate = async () => {
    setIsConfirmModalOpen(false);
    setIsEditModalOpen(false);

    const dataToSend = new FormData();
    dataToSend.append('product_name', formData.product_name);
    dataToSend.append('barcode', formData.barcode);
    dataToSend.append('category_id', formData.category_id);
    dataToSend.append('price', formData.price);
    dataToSend.append('unit', formData.unit);
    dataToSend.append('product_status', formData.product_status);

    // เก็บ URL ชั่วคราวของรูปภาพ (ถ้ามีการเปลี่ยนรูป)
    let tempImageUrl = null;
    if (formData.image instanceof File) {
      dataToSend.append('image', formData.image);
      tempImageUrl = URL.createObjectURL(formData.image);
    }

    // 🌟 Optimistic Update: เปลี่ยนค่าบนตารางหน้าจอ "ทันที" ให้ดูรวดเร็ว
    setProducts(prevList => prevList.map(item => 
      String(item.product_id) === String(selectedProduct.product_id) 
        ? { 
            ...item, 
            product_name: formData.product_name,
            barcode: formData.barcode,
            category_id: formData.category_id,
            price: formData.price,
            unit: formData.unit,
            product_status: formData.product_status || 'พร้อมขาย',
            ...(tempImageUrl && { image_preview_temp: tempImageUrl }) 
          }
        : item
    ));

    const loadingToast = toast.loading('กำลังอัปเดตข้อมูล...');

    try {
      const response = await fetch(`/api/products/${selectedProduct.product_id}`, {
        method: 'PUT',
        body: dataToSend
      });

      if (!response.ok) {
        toast.error('เกิดข้อผิดพลาด บาร์โค้ดอาจซ้ำกันในระบบ', { id: loadingToast });
        fetchProducts(); 
        return; 
      }

      toast.success('แก้ไขข้อมูลสินค้าสำเร็จ!', { id: loadingToast });
      fetchProducts(); 

    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('เซิร์ฟเวอร์เกิดข้อผิดพลาด', { id: loadingToast });
      fetchProducts();
    }
  };

  // 🌟 ฟังก์ชันเปิด Modal ลบ
  const handleDeleteClick = (product) => {
    setItemToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // 🌟 ฟังก์ชันยืนยันการลบ
  const confirmDelete = async () => {
    setIsDeleteModalOpen(false);
    if (!itemToDelete) return;

    const loadingToast = toast.loading('กำลังลบข้อมูล...');
    try {
      const response = await fetch(`/api/products/${itemToDelete.product_id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('ลบข้อมูลสินค้าสำเร็จ', { id: loadingToast });
        fetchProducts(); 
      } else {
        toast.error('ไม่สามารถลบสินค้าได้ เนื่องจากมีการผูกกับประวัติอื่นๆ', { id: loadingToast });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล', { id: loadingToast });
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-800 flex flex-col overflow-hidden">

      <Toaster position="top-center" reverseOrder={false} />

      {/* --- Header --- */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 gap-2 sm:gap-4">
        {/* ซ้าย: ปุ่มย้อนกลับ */}
        <div className="flex-1 flex justify-start">
            <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 sm:gap-2 text-slate-500 hover:text-blue-600 font-semibold transition-colors bg-slate-50 px-3 sm:px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-xs sm:text-sm whitespace-nowrap"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline">กลับหน้าหลัก</span>
            <span className="inline sm:hidden">กลับ</span>
            </button>
        </div>

        {/* กลาง: ข้อความ */}
        <div className="flex-1 flex flex-col justify-center items-center text-center mx-2">
            <h1 className="text-sm sm:text-lg md:text-xl font-bold text-slate-800 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            จัดการคลังสินค้า
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            จัดการข้อมูล เพิ่ม ลด และแก้ไขสินค้าในระบบ
            </p>
        </div>

       {/* ขวา: ปุ่มเพิ่มสินค้า */}
        <div className="flex-1 flex justify-end">
          {isAdmin && (
            <button 
              onClick={() => navigate('/add-product')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 sm:px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 sm:gap-2 transition-all text-xs sm:text-sm whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>เพิ่มสินค้า<span className="hidden sm:inline">ใหม่</span></span>
            </button>
          )}
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 p-3 sm:p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-2 sm:space-y-6">

          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 sm:gap-4 bg-white p-1 sm:p-4 rounded-xl shadow-sm border border-gray-200">
            {/* Search */}
            <div className="md:col-span-2 flex items-center gap-3 border border-slate-300 px-4 py-2 sm:py-2.5 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z" />
              </svg>
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ บาร์โค้ด..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full outline-none text-sm text-slate-700 placeholder-slate-400 bg-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-slate-300 px-4 py-2 sm:py-2.5 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm appearance-none text-slate-700"
              >
                <option value="">ทุกประเภท</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-slate-300 px-4 py-2 sm:py-2.5 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm appearance-none text-slate-700"
              >
                <option value="">ทุกสถานะ</option>
                <option value="พร้อมขาย">พร้อมขาย</option>
                <option value="หมด">หมด (สินค้าหมด)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </div>
            </div>
          </div>

          {/* Table & Card Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">

            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm font-semibold border-b border-slate-200">
                    <th className="p-4 w-24 text-center">รูปภาพ</th>
                    <th className="p-4">รหัสบาร์โค้ด</th>
                    <th className="p-4">ชื่อสินค้า</th>
                    <th className="p-4">ประเภท</th>
                    <th className="p-4 text-right">ราคา</th>
                    <th className="p-4 text-center">หน่วย</th>
                    <th className="p-4 text-center">สถานะ</th>
                    <th className="p-4 text-center w-36">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {currentProducts.map((product) => (
                    <tr key={product.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="w-12 h-12 rounded-md border border-slate-200 overflow-hidden bg-white flex items-center justify-center mx-auto">
                          {product.image_preview_temp ? (
                            <img src={product.image_preview_temp} alt={product.product_name} className="w-full h-full object-cover" />
                          ) : product.image ? (
                            <img src={(product.image?.startsWith('http') ? product.image : `/uploads/${product.image}`)} alt={product.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600">{product.barcode || '-'}</td>
                      <td className="p-4 font-semibold text-slate-800">{product.product_name}</td>
                      <td className="p-4 text-slate-600">
                        {categories.find(c => String(c.category_id) === String(product.category_id))?.category_name || 'ทั่วไป'}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">฿{Number(product.price).toFixed(2)}</td>
                      <td className="p-4 text-center text-slate-500">{product.unit || 'ชิ้น'}</td>
                      <td className="p-4 text-center">
                        {(!product.product_status || product.product_status === 'พร้อมขาย') ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> พร้อมขาย
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> หมด
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {isAdmin ? (
                          <div className="flex justify-center items-center gap-2">
                            <button onClick={() => handleEditClick(product)} className="p-1.5 bg-white border border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400 rounded-md transition-colors shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                            </button>
                            <button onClick={() => handleDeleteClick(product)} className="p-1.5 bg-white border border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-400 rounded-md transition-colors shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center text-slate-300 font-bold">-</div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500 font-medium">ไม่พบข้อมูลสินค้า</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile / iPad View */}
            <div className="block lg:hidden divide-y divide-slate-100 flex-1">
              {currentProducts.map((product) => (
                <div key={product.product_id} className="p-3 sm:p-4 flex gap-3 sm:gap-4 items-start bg-white hover:bg-slate-50 transition-colors">

                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50">
                    {product.image_preview_temp ? (
                      <img src={product.image_preview_temp} alt={product.product_name} className="w-full h-full object-cover" />
                    ) : product.image ? (
                      <img src={(product.image?.startsWith('http') ? product.image : `/uploads/${product.image}`)} alt={product.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-slate-800 text-sm sm:text-base leading-tight line-clamp-2">{product.product_name}</h3>
                        <span className="font-bold text-slate-800 text-sm sm:text-base whitespace-nowrap">฿{Number(product.price).toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] sm:text-xs font-mono text-slate-500 mt-1 truncate">บาร์โค้ด: {product.barcode || '-'}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="bg-slate-100 text-slate-600 text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-medium border border-slate-200">
                          {categories.find(c => String(c.category_id) === String(product.category_id))?.category_name || 'ทั่วไป'}
                        </span>

                        {(!product.product_status || product.product_status === 'พร้อมขาย') ? (
                          <span className="text-[10px] sm:text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">พร้อมขาย</span>
                        ) : (
                          <span className="text-[10px] sm:text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 font-semibold">หมด</span>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleEditClick(product)} className="p-1.5 sm:p-2 border border-slate-300 text-slate-600 hover:text-blue-600 rounded-md bg-white shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                          </button>
                          <button onClick={() => handleDeleteClick(product)} className="p-1.5 sm:p-2 border border-slate-300 text-slate-600 hover:text-red-600 rounded-md bg-white shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-medium text-sm">ไม่พบข้อมูลสินค้า</div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 select-none mt-auto">
                <span className="text-[11px] sm:text-xs text-slate-500 font-medium text-center">
                  แสดงหน้าที่ {currentPage} จาก {totalPages} (รวม {filteredProducts.length} รายการ)
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">

                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1} 
                    className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[11px] sm:text-sm font-medium"
                  >
                    ก่อนหน้า
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`dots-${index}`} className="w-4 sm:w-6 flex justify-center items-end pb-1 text-slate-400 text-[11px] sm:text-sm font-bold tracking-widest">
                          ...
                        </span>
                      ) : (
                        <button 
                          key={page} 
                          onClick={() => setCurrentPage(page)} 
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md text-[11px] sm:text-sm font-medium transition-all ${currentPage === page ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {page}
                        </button>
                      )
                    ))}
                  </div>

                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={currentPage === totalPages} 
                    className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[11px] sm:text-sm font-medium"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* 1. Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">

            <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                แก้ไขข้อมูลสินค้า
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveClick} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-sm text-slate-700 custom-scrollbar">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">รูปภาพสินค้า</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 sm:p-4 rounded-lg border border-dashed border-slate-300">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border border-slate-200 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" id="edit-product-image" onChange={handleImageChange} className="hidden" />
                    <label htmlFor="edit-product-image" className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-3 py-2 rounded-lg font-medium cursor-pointer transition-colors shadow-sm text-[11px] sm:text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      อัปโหลดรูปใหม่
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">รหัสบาร์โค้ด</label>
                <input type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-slate-50 focus:bg-white text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">ชื่อสินค้า</label>
                <input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-slate-50 focus:bg-white text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">ประเภทสินค้า</label>
                  <select name="category_id" value={formData.category_id} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm">
                    <option value="">เลือกประเภท</option>
                    {categories.map(c => (
                      <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">ราคา (บาท)</label>
                  <input type="number" name="price" step="0.01" value={formData.price} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-slate-50 focus:bg-white text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">ลักษณะนาม</label>
                  <input type="text" name="unit" placeholder="เช่น ชิ้น, ขวด" value={formData.unit} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-slate-50 focus:bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">สถานะสินค้า</label>
                  <select 
                    name="product_status" 
                    value={formData.product_status} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 outline-none bg-slate-50 focus:bg-white font-medium text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  >
                    <option value="พร้อมขาย">พร้อมขาย</option>
                    <option value="หมด">หมด (สินค้าหมด)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 sm:pt-5 border-t border-slate-200 mt-4 sm:mt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium text-xs sm:text-sm">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium text-xs sm:text-sm">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Confirmation Edit Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-200 p-5 sm:p-6 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 sm:w-8 sm:h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">ยืนยันการบันทึก</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              คุณต้องการบันทึกการแก้ไขข้อมูลสินค้านี้ลงในระบบใช่หรือไม่?
            </p>

            <div className="flex gap-2 sm:gap-3 justify-center mt-6 sm:mt-8">
              <button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium rounded-lg transition-colors w-full text-xs sm:text-sm">ยกเลิก</button>
              <button onClick={handleConfirmUpdate} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors w-full text-xs sm:text-sm">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Confirmation Modal (แทน window.confirm) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-200 p-5 sm:p-6 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 border border-red-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 sm:w-8 sm:h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">ยืนยันการลบสินค้า</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              คุณต้องการลบ <strong>"{itemToDelete?.product_name}"</strong> <br/>ออกจากคลังสินค้าใช่หรือไม่?
            </p>

            <div className="flex gap-2 sm:gap-3 justify-center mt-6 sm:mt-8">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium rounded-lg transition-colors w-full text-xs sm:text-sm">ยกเลิก</button>
              <button onClick={confirmDelete} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors w-full text-xs sm:text-sm">ลบทิ้ง</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageProducts;