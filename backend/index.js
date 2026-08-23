const express = require('express');
const cors = require('cors');
const multer = require('multer'); 
const path = require('path');
const bcrypt = require('bcrypt'); // 🌟 เพิ่ม bcrypt สำหรับระบบรักษาความปลอดภัยรหัสผ่าน
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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
const jwt = require('jsonwebtoken');
const { verifyToken } = require('./middleware/authMiddleware');

// ดักจับทุก Request ที่เข้ามาที่ /api
app.use('/api', (req, res, next) => {
    // ยกเว้นเส้นทาง login ไม่ต้องตรวจ Token
    if (req.path === '/login') {
        return next();
    }
    verifyToken(req, res, next);
});


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
        
        // 🎉 สร้าง Token JWT
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // Token มีอายุ 8 ชั่วโมง
        );

        // 🎉 กรณีที่ 3: ล็อกอินผ่านสำเร็จ ส่งข้อมูลสำคัญกลับไปให้ฝั่ง React นำไปใช้งานต่อ
        // 🎉 ตรงส่วนท้ายของ app.post('/api/login') ก่อนปิด try
        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token: token,                  // 🌟 ส่ง Token ไปให้ Frontend
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
// 🛠️ API อัปเดตข้อมูลผู้ใช้งาน (แก้ไขข้อมูล & รหัสผ่าน & เคลียร์รูปเก่า)
// ==========================================
app.put('/api/users/:id', upload.single('profile_image'), async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, email, role, status, currentPassword, password } = req.body;
        
        if (!username || !email || !role || !status) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // 🌟 ดึงข้อมูลรหัสผ่าน และรูปโปรไฟล์เดิมจากฐานข้อมูลมาก่อน
        const [userRows] = await db.query('SELECT password, profile_image FROM users WHERE user_id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
        
        const oldProfileImage = userRows[0].profile_image;
        let profile_image = req.file ? req.file.filename : null;

        // 🌟 ถ้ามีการเปลี่ยนรูปโปรไฟล์ใหม่ ให้สั่งลบรูปโปรไฟล์เก่าออกจากเซิร์ฟเวอร์
        if (profile_image && oldProfileImage) {
            const oldImagePath = path.join(__dirname, 'uploads', oldProfileImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // กรณีต้องการเปลี่ยนรหัสผ่านพนักงาน
        if (password && password.trim() !== '') {
            const isMatch = await bcrypt.compare(currentPassword, userRows[0].password);
            
            if (!isMatch) {
                // 🚨 ถ้ารหัสผ่านผิด ให้ลบรูปใหม่ที่เพิ่งอัปโหลดขึ้นมาทิ้งทันทีเพื่อไม่ให้เป็นไฟล์ขยะค้างคา
                if (profile_image) {
                    const newImagePath = path.join(__dirname, 'uploads', profile_image);
                    if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
                }
                return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง!' });
            }

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
            // กรณีแก้ไขแค่ชื่อ, อีเมล หรือสิทธิ์ (ไม่ได้เปลี่ยนรหัส)
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
// 🗑️ API ลบผู้ใช้งาน + ลบไฟล์รูปโปรไฟล์ทิ้ง
// ==========================================
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 🌟 1. ดึงชื่อไฟล์รูปโปรไฟล์พนักงานออกมาก่อนลบข้อมูล
        const [userRows] = await db.query('SELECT profile_image FROM users WHERE user_id = ?', [userId]);
        const profileImage = userRows.length > 0 ? userRows[0].profile_image : null;

        // 2. ลบข้อมูลพนักงานออกจาก Database
        const sql = 'DELETE FROM users WHERE user_id = ?';
        const [result] = await db.query(sql, [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
        }

        // 🌟 3. สั่งลบไฟล์รูปโปรไฟล์บนโฟลเดอร์เซิร์ฟเวอร์ทิ้ง
        if (profileImage) {
            const imagePath = path.join(__dirname, 'uploads', profileImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
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
// 🛠️ API ค้นหาข้อมูลสินค้าด้วยบาร์โค้ด (อัปเกรดดึงสต็อก + แก้ปัญหาโหลดค้าง)
// ==========================================
app.get('/api/products/barcode/:barcode', async (req, res) => {
    try {
        const barcode = req.params.barcode;
        
        // 🌟 อัปเกรด SQL: ให้ JOIN ตาราง inventory เพื่อดึง quantity (จำนวนสต็อก)
        const sql = `
            SELECT p.*, IFNULL(i.quantity, 0) AS stock 
            FROM products p
            LEFT JOIN inventory i ON p.product_id = i.product_id
            WHERE p.barcode = ?
        `;
        
        // 🌟 ใช้ await db.query ให้ตรงกับโครงสร้างโปรเจคของคุณ (แก้อาการหมุนค้าง)
        const [results] = await db.query(sql, [barcode]);
        
        if (results.length > 0) {
            // เจอสินค้า! ส่งข้อมูลกลับไป (มี .stock ติดไปด้วยแล้ว)
            return res.status(200).json(results[0]);
        } else {
            // ไม่เจอ
            return res.status(404).json({ message: 'ไม่พบสินค้านี้ในระบบ' });
        }
    } catch (err) {
        console.error('Error finding product:', err);
        return res.status(500).json({ error: 'Database error' });
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
// 🛠️ API สำหรับแก้ไขข้อมูลสินค้า (รองรับรูปภาพ และลบรูปเก่าทิ้งอัตโนมัติ) - Method: PUT
// ==========================================
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const productId = req.params.id;
        const { product_name, category_id, barcode, unit, price, product_status } = req.body; 
        
        const final_status = product_status || 'พร้อมขาย';

        // 🌟 ดึงชื่อไฟล์รูปภาพเก่าจากฐานข้อมูลมาเตรียมไว้ก่อน
        const [oldProduct] = await db.query('SELECT image FROM products WHERE product_id = ?', [productId]);
        const oldImage = oldProduct.length > 0 ? oldProduct[0].image : null;

        let sql = "";
        let values = [];

        // กรณีที่ 1: มีการอัปโหลดรูปภาพใหม่เข้ามาแทนที่
        if (req.file) {
            // 🌟 สั่งลบรูปเก่าออกจากโฟลเดอร์ uploads ทันที (ถ้ามีอยู่จริง)
            if (oldImage) {
                const oldImagePath = path.join(__dirname, 'uploads', oldImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            sql = `
                UPDATE products 
                SET product_name = ?, category_id = ?, barcode = ?, unit = ?, price = ?, product_status = ?, image = ? 
                WHERE product_id = ?
            `;
            values = [product_name, category_id, barcode, unit, price, final_status, req.file.filename, productId];
        } 
        // กรณีที่ 2: ไม่ได้เปลี่ยนรูปภาพ (แก้ไขเฉพาะข้อความ)
        else {
            sql = `
                UPDATE products 
                SET product_name = ?, category_id = ?, barcode = ?, unit = ?, price = ?, product_status = ? 
                WHERE product_id = ?
            `;
            values = [product_name, category_id, barcode, unit, price, final_status, productId];
        }

        // สั่งอัปเดตข้อมูลด้วยระบบ await ให้เสร็จร้อยเปอร์เซ็นต์
        await db.query(sql, values);
        return res.status(200).json({ message: 'แก้ไขข้อมูลสินค้าสำเร็จ!' });

    } catch (error) {
        console.error("🚨 เกิดข้อผิดพลาดในการแก้ไขสินค้า:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'บาร์โค้ดนี้มีอยู่ในระบบแล้ว' });
        }
        return res.status(500).json({ error: 'ระบบหลังบ้านเกิดข้อผิดพลาด' });
    }
});

// ==========================================
// 🗑️ API สำหรับลบสินค้า + ลบไฟล์รูปบนเซิร์ฟเวอร์ทิ้งด้วย - Method: DELETE
// ==========================================
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;

        // 🌟 1. ดึงชื่อไฟล์รูปภาพสินค้ามาก่อนที่ข้อมูลจะถูกลบหายไป
        const [rows] = await db.query('SELECT image FROM products WHERE product_id = ?', [productId]);
        const productImage = rows.length > 0 ? rows[0].image : null;

        // 2. สั่งลบข้อมูลสินค้าออกจาก Database
        const sql = 'DELETE FROM products WHERE product_id = ?';
        const [result] = await db.query(sql, [productId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบสินค้าที่ต้องการลบในระบบ' });
        }
        
        // 🌟 3. ถ้าลบข้อมูลใน DB สำเร็จ ให้เคลียร์ไฟล์ภาพในโฟลเดอร์ uploads ทันที
        if (productImage) {
            const imagePath = path.join(__dirname, 'uploads', productImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        return res.status(200).json({ message: 'ลบสินค้าสำเร็จเรียบร้อย!' });

    } catch (error) {
        console.error('🚨 Error deleting product:', error);
        // ดัก Error กรณีสินค้านี้เคยถูกรับเข้าสต็อก ติด Foreign Key
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                error: 'ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีประวัติผูกอยู่ แนะนำให้เปลี่ยนสถานะเป็น "สินค้าหมด/เลิกขาย" แทนครับ' 
            });
        }
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบสินค้า' });
    }
});

// ==========================================
// 📦 API สำหรับดึงประวัติการรับสินค้า (GET)
// ==========================================
app.get('/api/stock-in', async (req, res) => {
    try {
        const sql = `
            SELECT s.stock_in_id, s.product_id, p.product_name, c.category_name as category, 
                   s.quantity, s.cost_price, s.expiration_date, s.received_date, 
                   u.username as added_by
            FROM stock_in s
            LEFT JOIN products p ON s.product_id = p.product_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN users u ON s.user_id = u.user_id
            ORDER BY s.received_date DESC
        `;
        
        const [results] = await db.query(sql);
        return res.status(200).json(results);

    } catch (error) {
        console.error("Error fetching stock in:", error);
        return res.status(500).json({ error: "Server Error" });
    }
});

// ==========================================
// 🛠️ API บันทึกการรับสินค้าเข้าสต็อก (Stock In)
// ==========================================
app.post('/api/stock-in', async (req, res) => {
    try {
        const { product_id, quantity, cost_price, expiration_date, user_id } = req.body;

        if (!product_id || !quantity || !cost_price) {
            return res.status(400).json({ error: 'กรุณาส่งข้อมูลให้ครบถ้วน' });
        }

        // 1. บันทึกประวัติลงตาราง stock_in 
        const insertStockIn = `
            INSERT INTO stock_in (product_id, quantity, cost_price, expiration_date, user_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const finalExpDate = expiration_date ? expiration_date : null; 
        await db.query(insertStockIn, [product_id, quantity, cost_price, finalExpDate, user_id]);

        // 2. ไปบวกยอดจำนวนสินค้าในตาราง inventory 
        const updateInventory = `
            UPDATE inventory 
            SET quantity = quantity + ? 
            WHERE product_id = ?
        `;
        await db.query(updateInventory, [quantity, product_id]);

        // 🌟 3. บันทึกประวัติลงตารางกล้องวงจรปิด (action: 'เพิ่ม')
        const insertLogNew = `
            INSERT INTO stock_logs (product_id, user_id, action, quantity)
            VALUES (?, ?, 'เพิ่ม', ?)
        `;
        const finalUserId = user_id || 1; 
        await db.query(insertLogNew, [product_id, finalUserId, quantity]);

        return res.status(201).json({ message: 'รับสินค้าเข้าสต็อกและอัปเดตยอดสำเร็จ!' });

    } catch (error) {
        console.error('🚨 Error in Stock In:', error);
        return res.status(500).json({ error: 'เซิร์ฟเวอร์ขัดข้อง ไม่สามารถบันทึกข้อมูลได้' });
    }
});

// ==========================================
// 🛠️ API สำหรับแก้ไขประวัติการรับสินค้า (PUT)
// ==========================================
app.put('/api/stock-in/:id', async (req, res) => {
    try {
        const stockInId = req.params.id;
        const { quantity, cost_price, expiration_date, user_id } = req.body; 

        const final_exp = expiration_date ? expiration_date : null;

        // 1. ตรวจสอบยอดจำนวนของเก่า
        const [results] = await db.query(`SELECT quantity, product_id FROM stock_in WHERE stock_in_id = ?`, [stockInId]);
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'ไม่พบล็อตสินค้าประวัตินี้' });
        }

        const oldQuantity = results[0].quantity;
        const productId = results[0].product_id;
        const difference = quantity - oldQuantity; 

        // 2. สั่งอัปเดตข้อมูลล็อตใหม่ลงตาราง stock_in
        const updateSql = `UPDATE stock_in SET quantity = ?, cost_price = ?, expiration_date = ? WHERE stock_in_id = ?`;
        await db.query(updateSql, [quantity, cost_price, final_exp, stockInId]);

        // 3. ปรับสมดุลสต็อกคงเหลือ และบันทึก Logs (ทำเมื่อมีการเปลี่ยนจำนวนเท่านั้น)
        if (difference !== 0) {
            await db.query(`UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?`, [difference, productId]);
            
            // 🌟 บันทึกประวัติลงตารางกล้องวงจรปิด (action: 'ปรับปรุง')
            // ใช้ชื่อตัวแปร insertLogUpdate ป้องกันไปชนกับตัวแปรอื่น
            const insertLogUpdate = `
                INSERT INTO stock_logs (product_id, user_id, action, quantity)
                VALUES (?, ?, 'ปรับปรุง', ?)
            `;
            const finalUserId = user_id || 1; 
            await db.query(insertLogUpdate, [productId, finalUserId, difference]);
        }

        return res.status(200).json({ message: 'แก้ไขข้อมูลสำเร็จ!' });

    } catch (error) {
        console.error("Error updating stock in:", error);
        return res.status(500).json({ error: 'เซิร์ฟเวอร์ขัดข้อง' });
    }
});

// ==========================================
// 🗑️ API สำหรับลบประวัติรับเข้าสินค้า (Method: DELETE)
// ==========================================
app.delete('/api/stock-in/:id', async (req, res) => {
    try {
        const stockInId = req.params.id;

        // 1. ตรวจสอบและดึงข้อมูลยอดเดิมก่อนลบ (เพื่อเอาไปหักออกจากคลัง)
        const [results] = await db.query(`SELECT product_id, quantity FROM stock_in WHERE stock_in_id = ?`, [stockInId]);
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'ไม่พบประวัติการรับสินค้านี้ในระบบ' });
        }

        const productId = results[0].product_id;
        const quantityToRemove = results[0].quantity; // จำนวนที่ต้องหักคืน

        // 2. สั่งลบประวัติออกจากตาราง stock_in
        await db.query(`DELETE FROM stock_in WHERE stock_in_id = ?`, [stockInId]);

        // 3. หักยอดสต็อกรวมในตาราง inventory กลับคืน
        await db.query(`UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?`, [quantityToRemove, productId]);

        // 4. 🌟 บันทึกประวัติลงตารางกล้องวงจรปิด (stock_logs) ว่ามีการ "ลด" สต็อก
        const insertLogSql = `
            INSERT INTO stock_logs (product_id, user_id, action, quantity)
            VALUES (?, ?, 'ลด', ?)
        `;
        // บันทึก user_id เป็น 1 ไปก่อน (เนื่องจาก Method DELETE แบบพื้นฐานไม่ได้ส่ง Body มา)
        await db.query(insertLogSql, [productId, 1, quantityToRemove]);

        return res.status(200).json({ message: 'ลบประวัติรับเข้าและหักสต็อกคืนสำเร็จ!' });

    } catch (error) {
        console.error("Error deleting stock in:", error);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ ไม่สามารถลบได้' });
    }
});

// ==========================================
// 🛒 API สำหรับบันทึกการขายสินค้า (POS) - Transactions
// ==========================================
app.post('/api/sales', async (req, res) => {
    const { user_id, total_price, payment_method, cart_items } = req.body;
    
    let connection; 
    
    try {
        // 🌟 รองรับการดึง Connection แบบปลอดภัย
        connection = typeof db.getConnection === 'function' ? await db.getConnection() : db; 
        
        // 🚦 เริ่มกระบวนการ Transaction
        if (typeof connection.beginTransaction === 'function') await connection.beginTransaction();

        // 1. บันทึกหัวบิลลงตาราง sales
        const finalPayment = payment_method || 'cash';
        const [saleResult] = await connection.query(
            `INSERT INTO sales (user_id, total_price, payment_method) VALUES (?, ?, ?)`, 
            [user_id, total_price, finalPayment]
        );
        const saleId = saleResult.insertId;

        // 2. วนลูปสินค้าในตะกร้าเพื่อบันทึก
        for (const item of cart_items) {
            // 2.1 บันทึกรายการลงบิล
            await connection.query(
                `INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
                [saleId, item.product_id, item.quantity, item.price]
            );

            // 2.2 ตัดยอดออกจากคลัง
            await connection.query(
                `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?`,
                [item.quantity, item.product_id]
            );

            // 🌟 2.3 แก้ไขตรงนี้: เปลี่ยนคำว่า 'ขายสินค้า' เป็น 'ลด' เพื่อให้ตรงกับ ENUM ใน Database
            await connection.query(
                `INSERT INTO stock_logs (product_id, user_id, action, quantity) VALUES (?, ?, 'ลด', ?)`,
                [item.product_id, user_id, item.quantity]
            );
        }

        // ✅ บันทึกลง Database จริง
        if (typeof connection.commit === 'function') await connection.commit(); 
        if (typeof connection.release === 'function') connection.release(); 
        
        res.status(201).json({ message: 'บันทึกการขายและตัดสต็อกสำเร็จ', sale_id: saleId });

    } catch (error) {
        // 🚨 ยกเลิกทั้งหมดถ้ามี Error
        if (connection) {
            if (typeof connection.rollback === 'function') await connection.rollback(); 
            if (typeof connection.release === 'function') connection.release();
        }
        console.error('🚨 Error in POS Transaction:', error);
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            res.status(500).json({ error: 'ตารางในฐานข้อมูลขาดคอลัมน์ payment_method' });
        } else {
            res.status(500).json({ error: 'เกิดข้อผิดพลาด บิลนี้ถูกยกเลิกการบันทึกแล้ว' });
        }
    }
});
// ==========================================
// 📊 API ประมวลผลข้อมูลสถิติตามช่วงเวลาจริง (สำหรับหน้ารายงานผล)
// ==========================================
app.get('/api/reports/sales-summary', async (req, res) => {
    try {
        const period = req.query.period || '7days';
        let dateCondition = "WHERE 1=1";
        let groupByClause = "DATE_FORMAT(sale_date, '%d/%m')"; // จัดกลุ่มรายวันเริ่มต้น

        if (period === 'today') {
            dateCondition = "WHERE DATE(sale_date) = CURDATE()";
            groupByClause = "DATE_FORMAT(sale_date, '%H:00')"; // รายชั่วโมง
        } else if (period === '7days') {
            dateCondition = "WHERE sale_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            groupByClause = "DATE_FORMAT(sale_date, '%a')"; // วันย่อ จ.-อา.
        } else if (period === 'month') {
            dateCondition = "WHERE MONTH(sale_date) = MONTH(NOW()) AND YEAR(sale_date) = YEAR(NOW())";
            groupByClause = "DATE_FORMAT(sale_date, '%d/%m')";
        } else if (period === 'year') {
            dateCondition = "WHERE YEAR(sale_date) = YEAR(NOW())";
            groupByClause = "DATE_FORMAT(sale_date, '%b')"; // เดือนย่อ
        }

        // 1. ดึงตัวเลขสรุปหลัก (KPI Summary)
        const summarySql = `
            SELECT 
                COALESCE(SUM(total_price), 0) as totalSales,
                COUNT(sale_id) as totalOrders,
                COALESCE(AVG(total_price), 0) as avgOrderValue
            FROM sales
            ${dateCondition}
        `;
        const [summaryRows] = await db.query(summarySql);

        // ดึงจำนวนชิ้นสินค้าที่ขายได้รวม
        const itemsSoldSql = `
            SELECT COALESCE(SUM(si.quantity), 0) as itemsSold
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.sale_id
            ${dateCondition.replace(/sale_date/g, "s.sale_date")}
        `;
        const [itemsSoldRows] = await db.query(itemsSoldSql);

        const summaryData = {
            totalSales: summaryRows[0].totalSales,
            totalOrders: summaryRows[0].totalOrders,
            avgOrderValue: summaryRows[0].avgOrderValue,
            itemsSold: itemsSoldRows[0].itemsSold
        };

        // 🌟 2. ดึงข้อมูลทำกราฟแท่ง (Chart Data) - แก้ไข ORDER BY ตรงนี้แล้ว 🌟
        const chartSql = `
            SELECT ${groupByClause} as label, SUM(total_price) as revenue
            FROM sales
            ${dateCondition}
            GROUP BY label
            ORDER BY MIN(sale_date) ASC
        `;
        const [chartRows] = await db.query(chartSql);
        
        // แปลงเป็นเปอร์เซ็นต์ความสูงสำหรับแท่ง SVG บนหน้าจอ
        const maxRevenue = Math.max(...chartRows.map(r => Number(r.revenue)), 1);
        const chartData = chartRows.map(r => ({
            label: r.label,
            revenue: r.revenue,
            percent: Math.max((Number(r.revenue) / maxRevenue) * 100, 5) // ให้มีความสูงขั้นต่ำ 5% เผื่อยอดยังน้อย
        }));

        // 3. ดึงอันดับ 3 สินค้าขายดีที่สุด (Top 3 Products)
        const topProductsSql = `
            SELECT 
                p.product_name, p.unit, p.image,
                SUM(si.quantity) as sold_qty,
                SUM(si.quantity * si.price) as revenue
            FROM sale_items si
            JOIN products p ON si.product_id = p.product_id
            JOIN sales s ON si.sale_id = s.sale_id
            ${dateCondition.replace(/sale_date/g, "s.sale_date")}
            GROUP BY si.product_id
            ORDER BY sold_qty DESC
            LIMIT 3
        `;
        const [productRows] = await db.query(topProductsSql);

        // ส่งข้อมูลสถิติที่แท้จริงกลับไปที่หน้าบ้าน
        res.status(200).json({
            summary: summaryData,
            chartData: chartData,
            topProducts: productRows
        });

    } catch (error) {
        console.error("Report System Error:", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการประมวลผลรายงานระบบ" });
    }
});

// ==========================================
// 📥 API ส่งออกข้อมูลยอดขายเป็นไฟล์ Excel
// ==========================================
app.get('/api/reports/export-excel', async (req, res) => {
    try {
        const period = req.query.period || '7days';
        let dateCondition = "WHERE 1=1";

        // เช็คช่วงเวลาเดียวกับที่แสดงบนกราฟ
        if (period === 'today') {
            dateCondition = "WHERE DATE(s.sale_date) = CURDATE()";
        } else if (period === '7days') {
            dateCondition = "WHERE s.sale_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if (period === 'month') {
            dateCondition = "WHERE MONTH(s.sale_date) = MONTH(NOW()) AND YEAR(s.sale_date) = YEAR(NOW())";
        } else if (period === 'year') {
            dateCondition = "WHERE YEAR(s.sale_date) = YEAR(NOW())";
        }

        // 1. ดึงข้อมูลรายการขายแบบละเอียดจากฐานข้อมูล
        const sql = `
            SELECT 
                s.sale_id,
                DATE_FORMAT(s.sale_date, '%d/%m/%Y %H:%i') as formatted_date,
                p.product_name,
                si.quantity,
                si.price,
                (si.quantity * si.price) as total_price
            FROM sales s
            JOIN sale_items si ON s.sale_id = si.sale_id
            JOIN products p ON si.product_id = p.product_id
            ${dateCondition}
            ORDER BY s.sale_date DESC
        `;
        const [rows] = await db.query(sql);

        // 2. เรียกใช้ไลบรารี exceljs เพื่อวาดตาราง Excel
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('รายงานยอดขาย');

        // 3. กำหนดหัวตารางของไฟล์ Excel
        worksheet.columns = [
            { header: 'เลขที่บิล', key: 'sale_id', width: 15 },
            { header: 'วัน-เวลาที่ขาย', key: 'formatted_date', width: 25 },
            { header: 'ชื่อสินค้า', key: 'product_name', width: 40 },
            { header: 'จำนวน (ชิ้น)', key: 'quantity', width: 15 },
            { header: 'ราคา/ชิ้น (บาท)', key: 'price', width: 20 },
            { header: 'ยอดรวม (บาท)', key: 'total_price', width: 20 }
        ];

        // แต่งสีหัวตารางนิดหน่อยให้ดูเป็นมืออาชีพ
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { horizontal: 'center' };

        // 4. เอาข้อมูลที่ดึงมาจาก Database ยัดใส่ Excel ทีละบรรทัด
        rows.forEach(row => {
            worksheet.addRow(row);
        });

        // 5. ส่งไฟล์กลับไปให้เบราว์เซอร์ดาวน์โหลด
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + encodeURIComponent(`Sales_Report_${period}.xlsx`)
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Export Excel Error:", error);
        res.status(500).send("เกิดข้อผิดพลาดในการสร้างไฟล์ Excel");
    }
});

// ==========================================
// 🧾 API ดึงประวัติบิลการขายทั้งหมด (สำหรับตารางหน้าจัดการบิล)
// ==========================================
app.get('/api/sales', async (req, res) => {
    try {
        // ใช้คำสั่ง SQL ดึงข้อมูลจากตาราง sales
        const sql = `
            SELECT s.sale_id, s.total_price, s.sale_date, u.username
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.user_id
            ORDER BY s.sale_date DESC
        `;
        
        const [results] = await db.query(sql);
        
        // ส่งข้อมูลกลับไปที่หน้าบ้าน (React)
        res.status(200).json(results);

    } catch (error) {
        console.error("Error fetching sales data:", error);
        // ส่ง Error กลับไป เพื่อไม่ให้เว็บค้าง
        res.status(500).json({ error: "เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลบิล" });
    }
});

// ==========================================
// 🧾 API ดึงรายการสินค้าในบิลนั้นๆ (สำหรับดูสลิป)
// ==========================================
app.get('/api/sales/:id/items', async (req, res) => {
    try {
        const saleId = req.params.id;
        
        const sql = `
            SELECT si.quantity, si.price, p.product_name
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.product_id
            WHERE si.sale_id = ?
        `;
        
        const [results] = await db.query(sql, [saleId]);
        res.status(200).json(results);

    } catch (error) {
        console.error("Error fetching sale items:", error);
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูลรายการสินค้าในบิลได้" });
    }
});

// ==========================================
// 🚨 API แจ้งเตือนสินค้าใกล้หมดอายุ (อัปเกรด โชว์ยอดตัดจริงแบบ FIFO)
// ==========================================
app.get('/api/alerts/expiring', async (req, res) => {
    try {
        const sql = `
            SELECT 
                si.stock_in_id AS alert_id, 
                p.product_id, 
                p.product_name, 
                p.barcode, 
                p.unit,
                si.expiration_date,
                DATEDIFF(si.expiration_date, CURDATE()) AS days_left,
                CASE 
                    WHEN DATEDIFF(si.expiration_date, CURDATE()) < 0 THEN 'expired' 
                    ELSE 'expiring' 
                END AS status,
                
                -- 🌟 ท่าไม้ตาย FIFO: คำนวณหักลบยอดขายจากล็อตเก่าสุดไปหาใหม่สุด
                (si.quantity - LEAST(
                    si.quantity, 
                    GREATEST(0, 
                        ( (SELECT SUM(quantity) FROM stock_in s2 WHERE s2.product_id = si.product_id AND (s2.status IS NULL OR s2.status != 'discarded')) - i.quantity ) 
                        - 
                        COALESCE((SELECT SUM(quantity) FROM stock_in s3 WHERE s3.product_id = si.product_id AND (s3.status IS NULL OR s3.status != 'discarded') AND s3.stock_in_id < si.stock_in_id), 0)
                    )
                )) AS quantity 
                
            FROM stock_in si
            JOIN products p ON si.product_id = p.product_id
            JOIN inventory i ON p.product_id = i.product_id
            WHERE si.expiration_date IS NOT NULL 
              AND (si.status IS NULL OR si.status != 'discarded') 
              AND DATEDIFF(si.expiration_date, CURDATE()) <= 3
            HAVING quantity > 0
            ORDER BY days_left ASC
        `;
        
        const [results] = await db.query(sql);
        res.status(200).json(results);

    } catch (error) {
        console.error("Error fetching expiry alerts:", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลแจ้งเตือน" });
    }
});

// ==========================================
// 🗑️ API ตัดสต็อกสินค้าที่หมดอายุทิ้ง (อัปเกรดความปลอดภัย)
// ==========================================
app.post('/api/inventory/discard', async (req, res) => {
    const { alert_id, product_id, quantity, user_id } = req.body;

    if (!alert_id || !product_id || !quantity) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 🌟 1. เช็คยอดคงเหลือปัจจุบันใน inventory ก่อน
        const [invRows] = await connection.query('SELECT quantity FROM inventory WHERE product_id = ?', [product_id]);
        const currentInvQty = invRows.length > 0 ? invRows[0].quantity : 0;

        // 🌟 2. หาค่าที่จะต้องลบทิ้งจริงๆ (ป้องกันไม่ให้ลบเกินยอดที่มีในคลัง เช่น หน้าเว็บส่งมา 10 แต่คลังเหลือ 5 ก็ให้ลบแค่ 5)
        const discardQty = Math.min(quantity, currentInvQty);

        // 🌟🌟 3. แก้ไขตรงนี้: เปลี่ยนสถานะเป็น 'discarded' แทนการแก้ quantity ให้เป็น 0
        // (ประวัติเดิมจะได้ยังอยู่ครบถ้วน)
        const updateStockInSql = `UPDATE stock_in SET status = 'discarded' WHERE stock_in_id = ?`;
        await connection.query(updateStockInSql, [alert_id]);

        // 4. หักยอดออกจาก inventory (ทำเฉพาะกรณีที่มีของเหลือให้หัก)
        if (discardQty > 0) {
            const updateInventorySql = `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?`;
            await connection.query(updateInventorySql, [discardQty, product_id]);

            // 🌟 5. บันทึกประวัติลง stock_logs ป้องกันพนักงานทุจริต 
            const insertLogSql = `
                INSERT INTO stock_logs (product_id, user_id, action, quantity) 
                VALUES (?, ?, 'ลด', ?)
            `;
            await connection.query(insertLogSql, [product_id, user_id || 1, discardQty]);
        }
        
        await connection.commit();
        res.status(200).json({ message: 'ตัดสต็อกสินค้าหมดอายุสำเร็จ!' });

    } catch (error) {
        await connection.rollback();
        console.error('Error discarding product:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตัดสต็อก' });
    } finally {
        connection.release();
    }
});

// ==========================================
// 📦 API สำหรับหน้าดูจำนวนสินค้าในคลัง (Inventory)
// ==========================================
app.get('/api/inventory', async (req, res) => {
    try {
        // ใช้ JOIN เพื่อดึงข้อมูลสินค้า (ชื่อ, รูป, บาร์โค้ด) มาประกอบกับ ยอดคงเหลือใน inventory
        const sql = `
            SELECT 
                i.inventory_id,
                i.quantity,
                i.min_quantity,
                p.product_id,
                p.barcode,
                p.product_name,
                p.image,
                p.unit,
                c.category_name
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            ORDER BY i.quantity ASC; -- เรียงลำดับให้ของที่ใกล้หมดหรือหมดแล้วขึ้นมาก่อน
        `;
        
        const [rows] = await db.query(sql);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error fetching inventory list:", err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคลังสินค้า' });
    }
});

// ==========================================
// 🛠️ API อัปเดตจุดสั่งซื้อขั้นต่ำ (min_quantity) ในคลังสินค้า
// ==========================================
app.put('/api/inventory/min-qty/:id', async (req, res) => {
    try {
        const inventoryId = req.params.id;
        const { min_quantity } = req.body;
        
        if (min_quantity === undefined || min_quantity === null || min_quantity < 0) {
            return res.status(400).json({ error: 'กรุณาระบุจำนวนขั้นต่ำให้ถูกต้อง' });
        }

        const sql = 'UPDATE inventory SET min_quantity = ? WHERE inventory_id = ?';
        await db.query(sql, [min_quantity, inventoryId]);
        res.status(200).json({ message: 'อัปเดตขั้นต่ำสำเร็จ!' });
        
    } catch (err) {
        console.error('Error updating min_quantity:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
    }
});

// ==========================================
// 🏪 API ดึงข้อมูลร้านค้า (GET)
// ==========================================
app.get('/api/store-settings', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM store_settings WHERE id = 1');
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.json({});
        }
    } catch (error) {
        console.error("Error fetching store settings:", error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ==========================================
// 🏪 API บันทึกข้อมูลร้านค้าและ QR Code (PUT)
// ==========================================
// ใช้ upload.single('qr_image') เพราะหน้าบ้านตั้งชื่อไฟล์ที่แนบมาว่า qr_image
app.put('/api/store-settings', upload.single('qr_image'), async (req, res) => {
    try {
        const { store_name } = req.body;
        let sql = "";
        let values = [];

        // ถ้ามีการอัปโหลดรูป QR Code มาใหม่
        if (req.file) {
            sql = `UPDATE store_settings SET store_name = ?, promptpay_qr = ? WHERE id = 1`;
            values = [store_name, req.file.filename];
        } 
        // ถ้าเปลี่ยนแค่ชื่อร้าน ไม่ได้เปลี่ยนรูป
        else {
            sql = `UPDATE store_settings SET store_name = ? WHERE id = 1`;
            values = [store_name];
        }

        await db.query(sql, values);
        res.status(200).json({ message: 'อัปเดตข้อมูลร้านค้าสำเร็จ!' });

    } catch (error) {
        console.error("Error updating store settings:", error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ==========================================
// 🔔 API ดึงประวัติความเคลื่อนไหวสต็อกล่าสุด (สำหรับกระดิ่งแจ้งเตือน Navbar)
// ==========================================
app.get('/api/stock-logs/recent', async (req, res) => {
    try {
        const sql = `
            SELECT 
                sl.log_id,
                sl.product_id,
                sl.action,
                sl.quantity,
                CASE 
                    WHEN sl.action IN ('เพิ่ม', 'รับเข้า', 'in', 'add') THEN 'add'
                    WHEN sl.action IN ('ลด', 'ขาย', 'out', 'sell') THEN 'sell'
                    WHEN sl.action IN ('ปรับปรุง', 'แก้ไข', 'edit') THEN 'edit'
                    ELSE 'other'
                END AS action_type,
                CASE 
                    WHEN sl.action IN ('เพิ่ม', 'รับเข้า', 'in', 'add') THEN 'ทำการเพิ่มสต็อก'
                    WHEN sl.action IN ('ลด', 'ขาย', 'out', 'sell') THEN 'ทำการลดสต็อก'
                    WHEN sl.action IN ('ปรับปรุง', 'แก้ไข', 'edit') THEN 'ทำการแก้ไขรายละเอียด'
                    ELSE CONCAT('ทำการ', sl.action)
                END AS action_detail,
                p.product_name,
                COALESCE(u.username, 'แอดมิน') AS user_name,
                sl.log_date AS created_at
            FROM stock_logs sl
            LEFT JOIN products p ON sl.product_id = p.product_id
            LEFT JOIN users u ON sl.user_id = u.user_id
            ORDER BY sl.log_date DESC
            LIMIT 100
        `;
        
        const [results] = await db.query(sql);
        res.status(200).json(results);

    } catch (err) {
        console.error('Error fetching recent logs:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// ==========================================
// 🛠️ API สร้างรหัสบาร์โค้ดภายในร้านอัตโนมัติ (Running Number)
// ==========================================
app.get('/api/products/generate-barcode', async (req, res) => {
    try {
        // คำสั่ง SQL: หาค่าบาร์โค้ดตัวเลขที่มากที่สุด ที่ขึ้นต้นด้วย '20' และมีความยาว 8 หลัก
        const sql = `
            SELECT MAX(CAST(barcode AS UNSIGNED)) as max_barcode 
            FROM products 
            WHERE barcode LIKE '20%' AND LENGTH(barcode) = 8
        `;
        
        // 🌟 เปลี่ยนมาใช้ await [results] แทน Callback แบบเก่า
        const [results] = await db.query(sql);
        
        const maxBarcode = results[0].max_barcode;
        let nextBarcode = '20000001'; // กำหนดค่าเริ่มต้น ถ้าในร้านยังไม่มีบาร์โค้ดรหัส 20xxxxxx เลย

        if (maxBarcode) {
            // ถ้ามีข้อมูลอยู่แล้ว เอาตัวเลขมาบวก 1 แล้วแปลงกลับเป็น String
            nextBarcode = (maxBarcode + 1).toString();
        }

        res.status(200).json({ barcode: nextBarcode });

    } catch (error) {
        console.error('Error generating barcode:', error);
        return res.status(500).json({ error: 'Database error' });
    }
});

// ==========================================
// เริ่มรันเซิร์ฟเวอร์
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`เซิร์ฟเวอร์กำลังรันอยู่ที่พอร์ต http://localhost:${PORT}`);
});