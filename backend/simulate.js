const db = require('./db');
const bcrypt = require('bcrypt');

async function runSimulation() {
    try {
        console.log('Starting simulation...');
        
        // 1. Ensure required users exist
        console.log('Ensuring users exist: pakiy, adminmap, admin');
        const usersToEnsure = [
            { username: 'pakiy', email: 'pakiy' + Date.now() + '@test.com', role: 'user' },
            { username: 'adminmap', email: 'adminmap' + Date.now() + '@test.com', role: 'admin' },
            { username: 'admin', email: 'admin' + Date.now() + '@shop.com', role: 'admin' }
        ];
        
        for (const u of usersToEnsure) {
            const [rows] = await db.query('SELECT user_id FROM users WHERE username = ?', [u.username]);
            if (rows.length === 0) {
                const hashed = await bcrypt.hash('password123', 10);
                await db.query(
                    'INSERT IGNORE INTO users (username, password, email, role, status) VALUES (?, ?, ?, ?, ?)',
                    [u.username, hashed, u.email, u.role, 'active']
                );
            }
        }
        
        // Get their user_ids
        const [userRows] = await db.query("SELECT user_id, username FROM users WHERE username IN ('pakiy', 'adminmap', 'admin')");
        const userMap = {};
        userRows.forEach(r => userMap[r.username] = r.user_id);
        
        const pakiyId = userMap['pakiy'];
        const adminmapId = userMap['adminmap'];
        const adminId = userMap['admin'];
        
        if (!pakiyId || (!adminmapId && !adminId)) {
            console.log("Users found:", userMap);
            throw new Error('Failed to create or find required users.');
        }

        const validAdmins = [];
        if (adminmapId) validAdmins.push(adminmapId);
        if (adminId) validAdmins.push(adminId);

        // 2. Update stock_in records to 31/8/2026 22:00 - 23:00
        console.log('Updating stock_in records...');
        const [stockInRows] = await db.query('SELECT stock_in_id FROM stock_in');
        for (const row of stockInRows) {
            const randomMin = Math.floor(Math.random() * 60);
            const randomSec = Math.floor(Math.random() * 60);
            const dateStr = `2026-08-31 22:${randomMin.toString().padStart(2, '0')}:${randomSec.toString().padStart(2, '0')}`;
            
            const randomAdmin = validAdmins[Math.floor(Math.random() * validAdmins.length)];
            
            await db.query(
                'UPDATE stock_in SET created_at = ?, user_id = ? WHERE stock_in_id = ?',
                [dateStr, randomAdmin, row.stock_in_id]
            );
        }
        console.log(`Updated ${stockInRows.length} stock_in records.`);

        // 3. Generate 30-40 sales on 1/9/2026 06:00 - 23:00
        console.log('Generating sales records...');
        const numSales = Math.floor(Math.random() * 11) + 30; // 30 to 40
        
        const [products] = await db.query('SELECT product_id, category_id, price FROM products');
        if (products.length === 0) {
            throw new Error('No products found to sell.');
        }
        
        const productsByCat = {};
        products.forEach(p => {
            if (!productsByCat[p.category_id]) productsByCat[p.category_id] = [];
            productsByCat[p.category_id].push(p);
        });

        const categoryWeights = [
            { catId: 2, weight: 40 }, 
            { catId: 1, weight: 40 }, 
            { catId: 4, weight: 10 }, 
            { catId: 3, weight: 9 },  
            { catId: 5, weight: 1 }   
        ];

        function getRandomProduct() {
            let totalWeight = 0;
            const availableWeights = categoryWeights.filter(cw => productsByCat[cw.catId] && productsByCat[cw.catId].length > 0);
            availableWeights.forEach(cw => totalWeight += cw.weight);
            
            if (totalWeight === 0) {
                return products[Math.floor(Math.random() * products.length)];
            }
            
            let randomNum = Math.random() * totalWeight;
            let selectedCat = availableWeights[0].catId;
            
            for (const cw of availableWeights) {
                randomNum -= cw.weight;
                if (randomNum <= 0) {
                    selectedCat = cw.catId;
                    break;
                }
            }
            
            const catProducts = productsByCat[selectedCat];
            return catProducts[Math.floor(Math.random() * catProducts.length)];
        }

        for (let i = 0; i < numSales; i++) {
            const hour = Math.floor(Math.random() * 17) + 6;
            const min = Math.floor(Math.random() * 60);
            const sec = Math.floor(Math.random() * 60);
            const saleDateStr = `2026-09-01 ${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            
            const numItems = Math.floor(Math.random() * 4) + 1; // 1 to 4 items
            const cartItems = [];
            let totalPrice = 0;
            
            for (let j = 0; j < numItems; j++) {
                const prod = getRandomProduct();
                const existing = cartItems.find(item => item.product_id === prod.product_id);
                if (existing) {
                    existing.quantity += 1;
                    totalPrice += parseFloat(prod.price);
                } else {
                    cartItems.push({
                        product_id: prod.product_id,
                        quantity: 1,
                        price: parseFloat(prod.price)
                    });
                    totalPrice += parseFloat(prod.price);
                }
            }
            
            const [saleRes] = await db.query(
                'INSERT INTO sales (user_id, total_price, payment_method, sale_date) VALUES (?, ?, ?, ?)',
                [pakiyId, totalPrice, 'cash', saleDateStr]
            );
            const saleId = saleRes.insertId;
            
            for (const item of cartItems) {
                await db.query(
                    'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [saleId, item.product_id, item.quantity, item.price]
                );
                
                await db.query(
                    'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
                    [item.quantity, item.product_id]
                );
                
                await db.query(
                    "INSERT INTO stock_logs (product_id, user_id, action, quantity, log_date) VALUES (?, ?, 'ลด', ?, ?)",
                    [item.product_id, pakiyId, item.quantity, saleDateStr]
                );
            }
        }
        
        console.log(`Successfully generated ${numSales} sales for user pakiy.`);
        process.exit(0);

    } catch (error) {
        console.error('Error during simulation:', error);
        process.exit(1);
    }
}

runSimulation();
