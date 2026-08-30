const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// สร้างการเชื่อมต่อกับฐานข้อมูล
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ตรวจสอบว่าเชื่อมต่อสำเร็จหรือไม่
pool.getConnection((err, connection) => {
    if (err) {
        console.error('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:', err.message);
    } else {
        console.log('เชื่อมต่อฐานข้อมูล MySQL สำเร็จแล้ว!');
        connection.release();
    }
});

// ส่งออก module ไปให้ไฟล์อื่นใช้งาน
module.exports = pool.promise();
