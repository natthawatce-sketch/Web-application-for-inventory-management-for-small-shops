const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // ดึง token จาก Header 'Authorization: Bearer <token>'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'ปฏิเสธการเข้าถึง: ไม่มี Token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // เก็บข้อมูลผู้ใช้ไว้ใน req.user เพื่อให้ route อื่นๆ นำไปใช้ต่อได้
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'ปฏิเสธการเข้าถึง: สำหรับผู้ดูแลระบบเท่านั้น' });
    }
};

module.exports = {
    verifyToken,
    isAdmin
};
