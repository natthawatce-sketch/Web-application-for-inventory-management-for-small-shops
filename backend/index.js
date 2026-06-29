const express = require('express');
const cors = require('cors');
const multer = require('multer'); 
const path = require('path');
const bcrypt = require('bcrypt'); // 🌟 เพิ่ม bcrypt สำหรับระบบรักษาความปลอดภัยรหัสผ่าน
require('dotenv').config();

// เรียกใช้ไฟล์ตั้งค่าฐานข้อมูล
const db = require('./db');

const app = express();

// เปิดใช้งาน Middleware
app.use(cors()); 
app.use(express.json()); 

// ==========================================
// 🌟 ตั้งค่าระบบอัปโหลดไฟล์รูปภาพ (Multer)
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage }); 

// อนุญาตให้หน้าเว็บดึงรูปภาพจากโฟลเดอร์ uploads ไปแสดงผลได้
app.use('/uploads', express.static('uploads'));


// API เส้นทางพื้นฐานเพื่อทดสอบระบบ
app.get('/', (req, res) => {
    res.send('ยินดีต้อนรับสู่ Backend ของระบบบริหารจัดการสินค้า');
});

// ==========================================
// 🔑 API สำหรับระบบเข้าสู่ระบบ (Login) - เวอร์ชัน Bcrypt เต็มรูปแบบ
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        // รับค่า username และ password ที่ส่งมาจากฝั่ง React (หน้าบ้าน)
        const { username, password } = req.body;
      
        // ตรวจสอบความครบถ้วนของข้อมูลก่อนประมวลผล
        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // ค้นหาผู้ใช้งานจาก username หรือ email และคอลัมน์ status ต้องเป็น "active" เท่านั้น
        const sql = 'SELECT * FROM users WHERE (username = ? OR email = ?) AND status = "active"';
        
        // วิ่งไปค้นหาในฐานข้อมูลด้วยระบบ await (Promise)
        const [results] = await db.query(sql, [username, username]);
      
        // ❌ กรณีที่ 1: ถ้าไม่พบข้อมูล User คนนี้ในระบบเลย หรือสถานะไม่ใช่ active
        if (results.length === 0) {
            return res.status(401).json({ message: 'ไม่พบชื่อผู้ใช้งาน/อีเมลนี้ หรือบัญชีผู้ใช้ถูกระงับ' });
        }
      
        // ดึงข้อมูลผู้ใช้งานแถวแรกที่เจอออกมา
        const user = results[0];
      
        // 🔐 กรณีที่ 2: ตรวจสอบรหัสผ่านลับ (Bcrypt)
        // เปรียบเทียบ password (ข้อความธรรมดาที่ผู้ใช้กรอก) กับ user.password (รหัสที่ผ่านการแฮชยาวๆ ใน DB)
        const isMatch = await bcrypt.compare(password, user.password);
        
        // ถ้าผลลัพธ์การถอดรหัสออกมาแล้ว "ไม่ตรงกัน"
        if (!isMatch) {
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อแอดมิน" });
        }
        
        // 🎉 กรณีที่ 3: ล็อกอินผ่านสำเร็จ ส่งข้อมูลสำคัญกลับไปให้ฝั่ง React นำไปใช้งานต่อ
        // 🎉 ตรงส่วนท้ายของ app.post('/api/login') ก่อนปิด try
        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user_id: user.user_id,         // 🌟 เพิ่มการส่ง ID กลับไป
            username: user.username,
            email: user.email,             // 🌟 เพิ่มการส่งอีเมลกลับไป
            role: user.role,
            status: user.status,
            profile_image: user.profile_image // 🌟 เพิ่มการส่งชื่อรูปกลับไป
        });
      
    } catch (error) {
        // คอยดักจับ Error กรณีฐานข้อมูลพัง หรือเซิร์ฟเวอร์ระบบขัดข้อง
        console.error("🚨 เกิดข้อผิดพลาดในระบบล็อกอิน:", error);
        return res.status(500).json({ message: 'ระบบประมวลผลเซิร์ฟเวอร์ผิดพลาด' });
    }
});

// ==========================================
// 👥 API สำหรับผู้ใช้งาน (Users)
// ==========================================
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT user_id, username, email, role, status FROM users');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

// 🌟 เพิ่ม API สำหรับดึงข้อมูลโปรไฟล์ของคนที่ล็อกอินอยู่รายบุคคล
app.get('/api/users/profile/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const sql = 'SELECT user_id, username, email, role, profile_image FROM users WHERE user_id = ?';
        const [rows] = await db.query(sql, [userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
    }
});

// 🌟 อัปเดต: เพิ่มระบบเข้ารหัสผ่าน (Bcrypt) ตอนเพิ่มผู้ใช้ใหม่
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, email, role, status } = req.body;
        
        if (!username || !password || !email || !role || !status) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // 🔐 สร้างรหัสผ่านแบบ Hashed ก่อนบันทึกลง Database
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = 'INSERT INTO users (username, password, email, role, status) VALUES (?, ?, ?, ?, ?)';
        const values = [username, hashedPassword, email, role, status]; 

        const [result] = await db.query(sql, values);
        
        res.status(201).json({ 
            message: 'เพิ่มผู้ใช้งานสำเร็จ!', 
            userId: result.insertId 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล (อาจมี Email นี้ในระบบแล้ว)' });
    }
});

// ==========================================
// 🛠️ API อัปเดตข้อมูลผู้ใช้งาน (แก้ไขข้อมูล & รหัสผ่าน & รูปโปรไฟล์)
// ==========================================
app.put('/api/users/:id', upload.single('profile_image'), async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 🌟 1. ดึง currentPassword มารับค่าด้วย (ของเดิมไม่มี)
        const { username, email, role, status, currentPassword, password } = req.body;
        
        if (!username || !email || !role || !status) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        let profile_image = req.file ? req.file.filename : null;

        // 🔒 2. กรณีที่ตรวจพบว่าผู้ใช้พิมพ์รหัสผ่านใหม่เข้ามา (ต้องการเปลี่ยนรหัส)
        if (password && password.trim() !== '') {
            
            // วิ่งไปดึงรหัสผ่านเก่า (Hashed) จากฐานข้อมูลมาเช็คก่อน
            const [user] = await db.query('SELECT password FROM users WHERE user_id = ?', [userId]);
            if (user.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });

            // ใช้ bcrypt เทียบรหัสที่กรอกช่อง "รหัสปัจจุบัน" กับรหัสในฐานข้อมูล
            const isMatch = await bcrypt.compare(currentPassword, user[0].password);
            
            // 🚨 ถ้ารหัสเก่าไม่ตรงกัน ให้เตะกลับพร้อมส่งข้อความด่าให้หน้าบ้าน
            if (!isMatch) {
                return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง!' });
            }

            // ถ้ารหัสเก่าถูกต้อง ค่อยทำการเข้ารหัสใหม่ แล้วเตรียมเซฟ
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            let sql = 'UPDATE users SET username=?, email=?, role=?, status=?, password=?';
            let values = [username, email, role, status, hashedPassword];

            if (profile_image) {
                sql += ', profile_image=?';
                values.push(profile_image);
            }
            sql += ' WHERE user_id=?';
            values.push(userId);

            await db.query(sql, values);

        } else {
            // 📝 3. กรณีไม่ได้พิมพ์รหัสผ่านใหม่ (แก้ไขแค่ชื่อ, อีเมล, หรือรูป)
            let sql = 'UPDATE users SET username=?, email=?, role=?, status=?';
            let values = [username, email, role, status];

            if (profile_image) {
                sql += ', profile_image=?';
                values.push(profile_image);
            }
            sql += ' WHERE user_id=?';
            values.push(userId);

            await db.query(sql, values);
        }

        // ดึงชื่อไฟล์รูปใหม่ล่าสุดกลับไปอัปเดตหน้าบ้านให้สวยงาม
        const [updatedUser] = await db.query('SELECT profile_image FROM users WHERE user_id = ?', [userId]);

        res.json({ 
            message: 'อัปเดตข้อมูลผู้ใช้งานและรูปโปรไฟล์สำเร็จ!',
            profile_image: updatedUser[0].profile_image 
        });

    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'ชื่อผู้ใช้หรืออีเมลนี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น' });
        }
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
    }
});

// ==========================================
// 🗑️ API ลบผู้ใช้งาน
// ==========================================
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        const sql = 'DELETE FROM users WHERE user_id = ?';
        const [result] = await db.query(sql, [userId]);

        // ตรวจสอบว่าลบได้จริงไหม (เผื่อส่งไอดีที่ไม่มีอยู่จริงมา)
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
        }

        res.json({ message: 'ลบผู้ใช้งานออกจากระบบสำเร็จ!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
});

// ==========================================
// 📦 API สำหรับหมวดหมู่สินค้า (Categories)
// ==========================================
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM categories');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { category_name, description } = req.body;
        
        if (!category_name) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อหมวดหมู่' });
        }

        const sql = 'INSERT INTO categories (category_name, description) VALUES (?, ?)';
        const [result] = await db.query(sql, [category_name, description || null]);
        
        res.status(201).json({ 
            message: 'เพิ่มหมวดหมู่สำเร็จ!', 
            categoryId: result.insertId 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่' });
    }
});

// ==========================================
// 🏷️ API สำหรับสินค้า (Products)
// ==========================================
app.get('/api/products', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, c.category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.category_id
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า' });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { product_name, category_id, barcode, unit, price } = req.body;
        
        let image_filename = null;
        if (req.file) {
            image_filename = req.file.filename; 
        }
        
        if (!product_name || !category_id || !barcode || !unit || !price) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วน' });
        }

        // เพิ่ม product_status อัตโนมัติ
        const sqlProduct = `
            INSERT INTO products 
            (product_name, category_id, barcode, unit, price, image, product_status) 
            VALUES (?, ?, ?, ?, ?, ?, 'พร้อมขาย')
        `;
        const [productResult] = await db.query(sqlProduct, [product_name, category_id, barcode, unit, price, image_filename]);
        
        const newProductId = productResult.insertId;

        // สร้างข้อมูลสต็อกเริ่มต้นลงในตาราง inventory 
        const sqlInventory = 'INSERT INTO inventory (product_id, quantity) VALUES (?, 0)';
        await db.query(sqlInventory, [newProductId]);

        res.status(201).json({ 
            message: 'เพิ่มสินค้าและสร้างสต็อกเริ่มต้นสำเร็จ!', 
            productId: newProductId,
            image: image_filename
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มสินค้า (บาร์โค้ดอาจซ้ำ)' });
    }
});

// ==========================================
// เริ่มรันเซิร์ฟเวอร์
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`เซิร์ฟเวอร์กำลังรันอยู่ที่พอร์ต http://localhost:${PORT}`);
});