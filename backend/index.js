const express = require('express');
const cors = require('cors');
const multer = require('multer'); 
const path = require('path');
const bcrypt = require('bcrypt'); // 🌟 เพิ่ม bcrypt สำหรับระบบรักษาความปลอดภัยรหัสผ่าน
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
// 🛠️ API ค้นหาข้อมูลสินค้าด้วยบาร์โค้ด (สำหรับหน้า Stock In)
// ==========================================
app.get('/api/products/barcode/:barcode', async (req, res) => {
    try {
        const barcode = req.params.barcode;
        const sql = 'SELECT * FROM products WHERE barcode = ?';
        
        // 🌟 เปลี่ยนมาใช้ await db.query เหมือน API อื่นๆ ในโปรเจค
        const [results] = await db.query(sql, [barcode]);
        
        if (results.length > 0) {
            // เจอสินค้า! ส่งข้อมูลกลับไป
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
// 🛠️ API สำหรับแก้ไขข้อมูลสินค้า (รองรับรูปภาพ) - Method: PUT
// ==========================================
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const productId = req.params.id;
        const { product_name, category_id, barcode, unit, price, product_status } = req.body; 
        
        // บังคับค่าเริ่มต้นป้องกัน null
        const final_status = product_status || 'พร้อมขาย';

        let sql = "";
        let values = [];

        // กรณีที่ 1: มีการอัปโหลดรูปภาพใหม่
        if (req.file) {
            sql = `
                UPDATE products 
                SET product_name = ?, category_id = ?, barcode = ?, unit = ?, price = ?, product_status = ?, image = ? 
                WHERE product_id = ?
            `;
            values = [product_name, category_id, barcode, unit, price, final_status, req.file.filename, productId];
        } 
        // กรณีที่ 2: ไม่ได้เปลี่ยนรูปภาพ
        else {
            sql = `
                UPDATE products 
                SET product_name = ?, category_id = ?, barcode = ?, unit = ?, price = ?, product_status = ? 
                WHERE product_id = ?
            `;
            values = [product_name, category_id, barcode, unit, price, final_status, productId];
        }

        // 🌟 แก้ไข: บังคับให้หลังบ้านทำงานจนเสร็จ แล้วค่อยตอบกลับ (ป้องการหลุด)
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error updating product:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    // ส่งสถานะ 400 ถ้าบาร์โค้ดซ้ำ
                    return res.status(400).json({ error: 'บาร์โค้ดนี้มีอยู่ในระบบแล้ว' });
                }
                // ส่งสถานะ 500 ถ้าพังจุดอื่น
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลสินค้า' });
            }
            
            // 🌟 สำคัญที่สุด: ส่งสถานะ 200 (สำเร็จ) กลับไปให้หน้าบ้านรับรู้
            return res.status(200).json({ message: 'แก้ไขข้อมูลสินค้าสำเร็จ!' });
        });

    } catch (error) {
        console.error("Catch Error:", error);
        return res.status(500).json({ error: 'ระบบหลังบ้านเกิดข้อผิดพลาด' });
    }
});

// ==========================================
// 🛠️ API สำหรับลบสินค้า (Delete Product) - Method: DELETE
// ==========================================
app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'DELETE FROM products WHERE product_id = ?';

    db.query(sql, [productId], (err, result) => {
        if (err) {
            console.error('Error deleting product:', err);
            
            // 💡 ดัก Error สำคัญ: กรณีสินค้านี้เคยถูกรับเข้าสต็อก หรือเคยขายไปแล้ว (ติด Foreign Key)
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ 
                    error: 'ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีประวัติการขายหรือสต็อกผูกอยู่ แนะนำให้เปลี่ยนสถานะเป็น "สินค้าหมด/เลิกขาย" แทนครับ' 
                });
            }
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบสินค้า' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบสินค้าที่ต้องการลบในระบบ' });
        }
        
        res.json({ message: 'ลบสินค้าสำเร็จเรียบร้อย!' });
    });
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
// 🗑️ API สำหรับลบสินค้า (Delete Product) - Method: DELETE
// ==========================================
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const sql = 'DELETE FROM products WHERE product_id = ?';

        // 🌟 เปลี่ยนมาใช้ await 
        const [result] = await db.query(sql, [productId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบสินค้าที่ต้องการลบในระบบ' });
        }
        
        return res.status(200).json({ message: 'ลบสินค้าสำเร็จเรียบร้อย!' });

    } catch (error) {
        console.error('Error deleting product:', error);
        // 💡 ดัก Error สำคัญ: กรณีสินค้านี้เคยถูกรับเข้าสต็อก ติด Foreign Key
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                error: 'ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีประวัติผูกอยู่ แนะนำให้เปลี่ยนสถานะเป็น "สินค้าหมด/เลิกขาย" แทนครับ' 
            });
        }
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบสินค้า' });
    }
});



// ==========================================
// เริ่มรันเซิร์ฟเวอร์
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`เซิร์ฟเวอร์กำลังรันอยู่ที่พอร์ต http://localhost:${PORT}`);
});