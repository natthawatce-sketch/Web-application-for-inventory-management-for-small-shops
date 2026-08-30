const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function setupDatabase() {
    console.log("Connecting to database...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    console.log("Connected! Creating tables...");

    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            role VARCHAR(50) DEFAULT 'user',
            status VARCHAR(50) DEFAULT 'active',
            profile_image VARCHAR(255) DEFAULT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            category_name VARCHAR(255) NOT NULL,
            description TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS products (
            product_id INT AUTO_INCREMENT PRIMARY KEY,
            barcode VARCHAR(255) UNIQUE NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            category_id INT,
            price DECIMAL(10, 2) NOT NULL,
            image VARCHAR(255),
            min_quantity INT DEFAULT 10,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS inventory (
            inventory_id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            quantity INT DEFAULT 0,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS product_history (
            log_id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            user_id INT,
            username VARCHAR(255),
            action VARCHAR(50) NOT NULL,
            details JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS stock_in (
            stock_in_id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            cost_price DECIMAL(10, 2),
            expiration_date DATE,
            user_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS stock_logs (
            log_id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            user_id INT,
            action VARCHAR(50) NOT NULL,
            quantity INT NOT NULL,
            log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS sales (
            sale_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            total_price DECIMAL(10, 2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS sale_items (
            sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
            sale_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS store_settings (
            id INT PRIMARY KEY DEFAULT 1,
            store_name VARCHAR(255) DEFAULT 'ร้านค้าของฉัน',
            promptpay_qr VARCHAR(255) DEFAULT NULL
        )`
    ];

    for (let sql of tables) {
        await connection.query(sql);
        console.log("Executed table query successfully.");
    }

    // Insert Default Admin
    const [rows] = await connection.query("SELECT * FROM users WHERE username = 'admin' OR email = 'admin@shop.com'");
    if (rows.length === 0) {
        console.log("Inserting default admin user...");
        const hashedPassword = await bcrypt.hash('password123', 10);
        await connection.query(
            "INSERT INTO users (username, password, email, role, status) VALUES (?, ?, ?, ?, ?)",
            ['admin', hashedPassword, 'admin@shop.com', 'admin', 'active']
        );
    }

    // Insert Default Store Settings
    const [storeRows] = await connection.query("SELECT * FROM store_settings WHERE id = 1");
    if (storeRows.length === 0) {
        console.log("Inserting default store settings...");
        await connection.query("INSERT INTO store_settings (id, store_name) VALUES (1, 'ร้านค้าของฉัน')");
    }

        try { await connection.query("ALTER TABLE products ADD COLUMN unit VARCHAR(50) DEFAULT 'ชิ้น'"); console.log("Added unit to products"); } catch(e) {}
    try { await connection.query("ALTER TABLE products ADD COLUMN product_status VARCHAR(50) DEFAULT 'active'"); console.log("Added product_status to products"); } catch(e) {}
    try { await connection.query("ALTER TABLE stock_in ADD COLUMN status VARCHAR(50) DEFAULT 'active'"); console.log("Added status to stock_in"); } catch(e) {}
        try { await connection.query("ALTER TABLE inventory ADD COLUMN min_quantity INT DEFAULT 10"); console.log("Added min_quantity to inventory"); } catch(e) {}
        try { await connection.query("ALTER TABLE inventory ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"); console.log("Added updated_at to inventory"); } catch(e) {}
    try { await connection.query("ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); console.log("Added created_at to products"); } catch(e) {}
        try { await connection.query("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); console.log("Added created_at to users"); } catch(e) {}
    console.log("Database setup complete!");
    await connection.end();
}

setupDatabase().catch(err => {
    console.error("Database setup failed:", err);
    process.exit(1);
});




