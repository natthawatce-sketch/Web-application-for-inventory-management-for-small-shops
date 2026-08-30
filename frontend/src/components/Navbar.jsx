import React, { useState, useEffect, useRef } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 🔔 1. State สำหรับกระดิ่งแจ้งเตือน
  const bellRef = useRef(null);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [stockLogs, setStockLogs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 🌟 State สำหรับระบบ ค้นหา กรอง และ Pagination ของแจ้งเตือน
  const [logSearchTerm, setLogSearchTerm] = useState("");
  const [logFilter, setLogFilter] = useState("all"); // 'all', 'add', 'reduce', 'edit'
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 6; // แสดงหน้าละ 6 รายการ

  // 💡 State สำหรับเก็บข้อมูลผู้ใช้
  const [username, setUsername] = useState("ProjectPOti");
  const [userRole, setUserRole] = useState("admin");
  const [profileImage, setProfileImage] = useState(null);

  // 🔔 State สำหรับแจ้งเตือน (เข้าสู่ระบบ / บันทึกร้านค้าสำเร็จ)
  const [showAlert, setShowAlert] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // 🏪 State สำหรับป๊อปอัปตั้งค่าร้านค้า
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [isStoreLoading, setIsStoreLoading] = useState(false);

  // ปิดเมนูดรอปดาวน์โปรไฟล์เมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ดึงข้อมูลจาก LocalStorage
  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    const storedRole = localStorage.getItem("user_role");
    const storedImage = localStorage.getItem("profile_image");

    if (storedName) setUsername(storedName);
    if (storedRole) setUserRole(storedRole);
    if (storedImage) setProfileImage(storedImage);
  }, []);

  // เช็คเพิ่งล็อกอิน
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem("just_logged_in");
    if (justLoggedIn === "true") {
      setShowAlert(true);
      sessionStorage.removeItem("just_logged_in");
      setTimeout(() => setShowAlert(false), 3000);
    }
  }, []);

  // 🌟 ดึงข้อมูลประวัติสต็อก (Stock Logs) จากหลังบ้านเมื่อโหลดหน้าเว็บ
  useEffect(() => {
    const fetchStockLogs = async () => {
      try {
        const res = await fetch("/api/stock-logs/recent");
        if (res.ok) {
          const data = await res.json();
          setStockLogs(data);
          setUnreadCount(data.length > 0 ? data.length : 0);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };
    fetchStockLogs();
  }, []);

  // 🌟 1. ปรับปรุงฟิลเตอร์ให้ฉลาดขึ้น รองรับคำที่หลากหลายจาก Database
  const filteredLogs = stockLogs.filter((log) => {
    const action = String(
      log.action_type || log.action_detail || log.action || "",
    ).toLowerCase();
    const product = String(
      log.product_name || log.action_detail || "",
    ).toLowerCase();
    const search = logSearchTerm.toLowerCase();

    // เช็คคำค้นหา
    const matchesSearch = product.includes(search);

    // เช็คปุ่ม Filter
    let matchesFilter = true;
    if (logFilter === "add") {
      // เพิ่มคำว่า 'รับเข้า' และ 'นำเข้า' เผื่อหลังบ้านส่งมาแบบนี้
      matchesFilter = ["in", "add", "เพิ่ม", "รับเข้า", "นำเข้า"].some((kw) =>
        action.includes(kw),
      );
    } else if (logFilter === "reduce") {
      matchesFilter = [
        "out",
        "sell",
        "ขาย",
        "ลด",
        "delete",
        "discard",
        "ทิ้ง",
        "ตัด",
      ].some((kw) => action.includes(kw));
    } else if (logFilter === "edit") {
      matchesFilter = ["edit", "update", "ปรับปรุง", "แก้ไข"].some((kw) =>
        action.includes(kw),
      );
    }

    return matchesSearch && matchesFilter;
  });

  // 🌟 คำนวณข้อมูลสำหรับ Pagination ของแจ้งเตือนที่กรองแล้ว
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  // 🌟 ฟังก์ชันสร้างปุ่มตัวเลขหน้า
  const renderPageNumbers = () => {
    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, "...", totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        ];
      } else {
        pages = [
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        ];
      }
    }

    return pages.map((page, index) =>
      page === "..." ? (
        <span key={index} className="px-1 text-slate-400 font-bold">
          ...
        </span>
      ) : (
        <button
          key={index}
          onClick={() => setCurrentPage(page)}
          className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${currentPage === page
            ? "bg-blue-600 text-white shadow-md"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
        >
          {page}
        </button>
      ),
    );
  };

  // 🏪 ฟังก์ชันเปิดป๊อปอัปตั้งค่าร้านค้า
  const openStoreModal = () => {
    setIsOpen(false);
    setIsStoreModalOpen(true);
    setIsStoreLoading(true);
    setQrFile(null);
    setStoreName("");
    setQrPreview(null);

    fetch("/api/store-settings", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data) {
          setStoreName(data.store_name || "");
          if (data.promptpay_qr) {
            setQrPreview((data.promptpay_qr?.startsWith('http') ? data.promptpay_qr : `/uploads/${data.promptpay_qr}`));
          }
        }
      })
      .catch((err) => console.error("Error fetching store data:", err))
      .finally(() => setIsStoreLoading(false));
  };

  const handleQrChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveStore = async () => {
    if (!storeName.trim()) return alert("กรุณากรอกชื่อร้านค้า");

    const formData = new FormData();
    formData.append("store_name", storeName);
    if (qrFile) formData.append("qr_image", qrFile);

    try {
      const response = await fetch("/api/store-settings", {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        setIsStoreModalOpen(false);
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 2500);
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error("Error saving store settings:", error);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // 🎨 2. ปรับแต่งฟังก์ชันดึงสีและไอคอน พร้อมคืนค่าสีของตัวเลขจำนวนสินค้า (qtyStyle)
  const getLogStyle = (actionData) => {
    const actionStr = String(actionData || "").toLowerCase();

    // ตรวจจับการ "เพิ่ม"
    if (
      ["in", "add", "เพิ่ม", "รับเข้า"].some((kw) => actionStr.includes(kw))
    ) {
      return {
        bg: "bg-green-100",
        text: "text-green-600",
        icon: "M12 4.5v15m7.5-7.5h-15",
        qtyStyle: "bg-green-100 text-green-700 border-green-200",
        qtyPrefix: "+",
      };
    }
    // ตรวจจับการ "ลด / ขาย / ตัดทิ้ง"
    if (
      ["out", "sell", "ขาย", "ลด", "delete", "discard", "ทิ้ง", "ตัด"].some(
        (kw) => actionStr.includes(kw),
      )
    ) {
      return {
        bg: "bg-blue-100",
        text: "text-blue-600",
        icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z",
        qtyStyle: "bg-red-100 text-red-700 border-red-200",
        qtyPrefix: "-",
      };
    }
    // ตรวจจับการ "แก้ไข"
    if (
      ["edit", "update", "ปรับปรุง", "แก้ไข"].some((kw) =>
        actionStr.includes(kw),
      )
    ) {
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-600",
        icon: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
        qtyStyle: "bg-yellow-100 text-yellow-700 border-yellow-200",
        qtyPrefix: "✏️ ",
      };
    }

    // Default
    return {
      bg: "bg-slate-100",
      text: "text-slate-600",
      icon: "M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3",
      qtyStyle: "bg-slate-100 text-slate-700 border-slate-200",
      qtyPrefix: "",
    };
  };

  return (
    <>
      <div className="w-full bg-blue-900 shadow-sm border-b border-blue-900/5 flex items-center justify-between px-6 py-3 relative z-40">
        {/* 🟢 กล่องแจ้งเตือนเข้าสู่ระบบสำเร็จ */}
        {showAlert && (
          <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-[100] border-l-4 border-green-700 animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-bold text-sm">เข้าสู่ระบบสำเร็จ!</p>
              <p className="text-xs text-green-100">
                ยินดีต้อนรับคุณ {username}
              </p>
            </div>
          </div>
        )}

        <div className="text-lg font-bold text-white truncate max-w-[100%]">
          ระบบจัดการคลังสินค้า
        </div>

        <div className="flex items-center gap-1">
          {/* 🔔 --- ไอคอนกระดิ่งแจ้งเตือน --- */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => {
                setIsBellOpen(true);
                setUnreadCount(0);
                setLogSearchTerm(""); // รีเซ็ตค้นหาเมื่อเปิดใหม่
                setLogFilter("all"); // รีเซ็ตตัวกรองเมื่อเปิดใหม่
                setCurrentPage(1); // ให้เริ่มที่หน้า 1 ใหม่เสมอ
              }}
              className="p-2 text-blue-200 hover:text-white hover:bg-blue-800 rounded-full transition-colors relative focus:outline-none mt-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              {/* จุดแดงแจ้งเตือน */}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-blue-900 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>

          {/* 👤 --- ปุ่มรูปโปรไฟล์ --- */}
          <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="border border-blue-700 flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-blue-800/80 focus:outline-none transition-colors text-white text-right"
            >
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold">{username}</p>
                <p className="text-xs text-blue-200 font-medium">
                  {userRole?.toLowerCase() === "admin" ||
                    username?.toLowerCase().includes("admin")
                    ? "เจ้าของร้าน (แอดมิน)"
                    : "พนักงาน"}
                </p>
              </div>

              <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white/50 overflow-hidden flex items-center justify-center">
                <img
                  src={
                    profileImage
                      ? (profileImage?.startsWith('http') ? profileImage : `/uploads/${profileImage}`)
                      : `https://ui-avatars.com/api/?name=${username || "User"}&background=eff6ff&color=1d4ed8&size=100`
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-3">
                <div className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors mb-2">
                  <img
                    src={
                      profileImage
                        ? (profileImage?.startsWith('http') ? profileImage : `/uploads/${profileImage}`)
                        : `https://ui-avatars.com/api/?name=${username || "User"}&background=eff6ff&color=1d4ed8&size=100`
                    }
                    alt="Profile"
                    className="w-10 h-10 rounded-full mr-3 object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">{username}</p>
                    <span
                      className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mt-1 ${userRole?.toLowerCase() === "admin" ||
                        username?.toLowerCase().includes("admin")
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {userRole?.toLowerCase() === "admin" ||
                        username?.toLowerCase().includes("admin")
                        ? "เจ้าของร้าน (แอดมิน)"
                        : "พนักงานทั่วไป"}
                    </span>
                  </div>
                </div>

                <hr className="border-gray-200 my-2" />

                <ul className="space-y-1 text-gray-700 text-sm">
                  {userRole?.toLowerCase() === "admin" ||
                    username?.toLowerCase().includes("admin") ? (
                    <>
                      <li>
                        <button
                          onClick={() => (window.location.href = "/add-user")}
                          className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                              />
                            </svg>
                          </span>
                          <span className="font-medium">เพิ่มผู้ใช้งาน</span>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() =>
                            (window.location.href = "/Manage-user")
                          }
                          className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                        >
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 mr-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                              />
                            </svg>
                          </span>
                          <span className="font-medium">
                            แก้ไขข้อมูล / รหัสผ่านพนักงาน
                          </span>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={openStoreModal}
                          className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                        >
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 mr-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                              />
                            </svg>
                          </span>
                          <span className="font-medium">
                            ตั้งค่าข้อมูลร้าน / การรับเงิน
                          </span>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() =>
                            (window.location.href = "/product-history")
                          }
                          className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                        >
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-600 mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                          <span className="font-medium">
                            ประวัติการแก้ไขข้อมูลสินค้า
                          </span>
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <button
                          onClick={() => (window.location.href = "/profile")}
                          className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 mr-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                              />
                            </svg>
                          </span>
                          <span className="font-medium">
                            แก้ไขข้อมูลส่วนตัว
                          </span>
                        </button>
                      </li>
                    </>
                  )}

                  <hr className="border-gray-200 my-2" />

                  <li>
                    <button
                      onClick={() => {
                        localStorage.clear();
                        window.location.href = "/";
                      }}
                      className="w-full flex items-center p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 mr-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                          />
                        </svg>
                      </span>
                      <span className="font-medium">ออกจากระบบ</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 1. ป๊อปอัปแจ้งเตือนสต็อก (Modal เด้งตรงกลางจอ) */}
      {isBellOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsBellOpen(false)} // กดพื้นหลังเพื่อปิด
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()} // ป้องกันการกดทะลุ
          >
            {/* Header ของแจ้งเตือน */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-900 border-b border-blue-800 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
                ความเคลื่อนไหวสต็อกล่าสุด
              </h3>
              <button
                onClick={() => setIsBellOpen(false)}
                className="text-blue-200 hover:text-white bg-blue-800/50 hover:bg-blue-600 p-1.5 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 🌟 โซนค้นหาและตัวกรอง Dropdown บนบรรทัดเดียวกัน */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-row gap-3 items-center justify-between shrink-0">
              {/* Dropdown Filter */}
              <select
                value={logFilter}
                onChange={(e) => {
                  setLogFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all cursor-pointer shadow-sm w-32 sm:w-40"
              >
                <option value="all">ทั้งหมด</option>
                <option value="add">ประวัติการเพิ่ม</option>
                <option value="reduce">ประวัติการลด</option>
                <option value="edit">ประวัติการแก้ไข</option>
              </select>

              {/* ช่องค้นหาชื่อสินค้า */}
              <div className="relative w-full max-w-[200px] sm:max-w-xs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสินค้า..."
                  value={logSearchTerm}
                  onChange={(e) => {
                    setLogSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all font-medium text-slate-700 shadow-sm"
                />
              </div>
            </div>

            {/* 🌟 List รายการแจ้งเตือน (มีการแสดงจำนวน) */}
            <div className="flex-1 overflow-y-auto p-2">
              {currentLogs.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {currentLogs.map((log, index) => {
                    // เรียกสีและไอคอนตามคำที่ส่งมาจาก Backend
                    const style = getLogStyle(
                      log.action_type || log.action_detail || log.action,
                    );

                    return (
                      <li
                        key={index}
                        className="p-4 hover:bg-slate-50 transition-colors flex items-start sm:items-center justify-between gap-3 rounded-xl mx-2 my-1 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-start gap-4 w-full">
                          <div
                            className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${style.bg} ${style.text}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d={style.icon}
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm sm:text-base font-bold text-slate-800 leading-tight flex flex-col gap-1">
                              {/* แถวที่ 1: ชื่อ Action ชิดซ้าย และ ป้ายแสดงจำนวนชิดขวา */}
                              <div className="flex justify-between items-start gap-2">
                                <span>
                                  {log.action_detail || log.action || "รายการ"}
                                </span>

                                {log.quantity != null && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-bold border whitespace-nowrap ${style.qtyStyle}`}
                                  >
                                    {style.qtyPrefix}
                                    {log.quantity} {log.unit || ""}
                                  </span>
                                )}
                              </div>

                              {/* แถวที่ 2: ชื่อสินค้า */}
                              <span className="text-blue-600">
                                ({log.product_name})
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center mt-1.5 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="w-3.5 h-3.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                                  />
                                </svg>
                                ผู้ทำรายการ:{" "}
                                <span className="font-bold text-slate-700">
                                  {log.user_name || "ระบบ"}
                                </span>
                              </span>
                              <span className="hidden sm:inline">•</span>
                              <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="w-3.5 h-3.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                  />
                                </svg>
                                {new Date(
                                  log.created_at || log.timestamp,
                                ).toLocaleString("th-TH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-16 h-16 mb-4 opacity-50"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                  </svg>
                  <p className="text-base font-medium">ไม่พบข้อมูลที่ค้นหา</p>
                </div>
              )}
            </div>

            {/* Footer ของแจ้งเตือน: แสดงระบบ Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <span className="text-xs font-bold text-slate-500 hidden sm:block">
                  หน้า {currentPage} จาก {totalPages}
                </span>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-sm"
                  >
                    ก่อนหน้า
                  </button>

                  <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar max-w-[150px] sm:max-w-none">
                    {renderPageNumbers()}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-sm"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌟 2. ป๊อปอัป Modal แจ้งเตือนบันทึกข้อมูลสำเร็จ (เด้งตรงกลางจอ) */}
      {showSaveSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/30 backdrop-blur-sm transition-opacity">
          <div className="bg-white px-8 py-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 transform transition-all scale-100 w-80 text-center animate-bounce">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800">
              บันทึกสำเร็จ!
            </h3>
            <p className="text-sm font-medium text-slate-500">
              อัปเดตข้อมูลร้านค้าและการรับเงินเรียบร้อยแล้ว
            </p>
          </div>
        </div>
      )}

      {/* 🌟 3. ป๊อปอัป Modal ตั้งค่าข้อมูลร้านค้า */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-5 flex justify-between items-center text-white shadow-md">
              <h3 className="text-lg font-bold flex items-center gap-2.5">
                <span className="p-1.5 bg-white/20 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                    />
                  </svg>
                </span>
                ตั้งค่าร้านค้า / การรับเงิน
              </h3>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="text-blue-100 hover:text-white bg-blue-800 hover:bg-blue-600 p-1.5 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body Modal */}
            {isStoreLoading ? (
              <div className="p-10 flex flex-col items-center justify-center space-y-3 h-80">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-500">
                  กำลังดึงข้อมูลร้านค้าปัจจุบัน...
                </p>
              </div>
            ) : (
              <div className="p-7 space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4 text-slate-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                      />
                    </svg>
                    ชื่อร้านค้า (แสดงบนใบเสร็จ)
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 transition-all font-medium text-slate-800"
                    placeholder="เช่น ร้านสะดวกซื้อ ProjectPOti"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4 text-slate-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM15 15h.008v.008H15V15zM18.75 18.75h.008v.008h-.008v-.008zM15 18.75h.008v.008H15v-.008zM18.75 15h.008v.008h-.008V15z"
                      />
                    </svg>
                    QR Code รับเงิน (PromptPay / ธนาคาร)
                  </label>

                  <div className="border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-2xl h-56 w-full flex flex-col items-center justify-center bg-blue-50/50 relative overflow-hidden group transition-colors">
                    {qrPreview ? (
                      <img
                        src={qrPreview}
                        alt="QR Code"
                        className="h-full w-full object-contain p-3 bg-white"
                      />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center">
                        <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-8 h-8 text-blue-300"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM15 15h.008v.008H15V15zM18.75 18.75h.008v.008h-.008v-.008zM15 18.75h.008v.008H15v-.008zM18.75 15h.008v.008h-.008V15z"
                            />
                          </svg>
                        </div>
                        <span className="font-medium text-slate-500">
                          ยังไม่มีรูป QR Code ร้านค้า
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                      <label className="bg-white text-blue-600 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                          />
                        </svg>
                        อัปโหลดรูปใหม่
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          className="hidden"
                          onChange={handleQrChange}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Modal */}
            <div className="bg-slate-50 px-6 py-5 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
                disabled={isStoreLoading}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveStore}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:bg-slate-300"
                disabled={isStoreLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
