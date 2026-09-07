const db = require('../backend/db');

async function fixSimulation() {
    try {
        console.log('Starting fix...');
        
        // Find users
        const [userRows] = await db.query("SELECT user_id, username FROM users WHERE username IN ('pakiy', 'adminmap', 'admin')");
        const userMap = {};
        userRows.forEach(r => userMap[r.username] = r.user_id);
        
        const pakiyId = userMap['pakiy'];
        const validAdmins = [];
        if (userMap['adminmap']) validAdmins.push(userMap['adminmap']);
        if (userMap['admin']) validAdmins.push(userMap['admin']);
        
        if (!pakiyId) {
            throw new Error('Could not find pakiy user');
        }

        // ==========================================
        // REVERT PREVIOUS SIMULATED SALES
        // ==========================================
        console.log('Reverting previous sales for pakiy...');
        const [sales] = await db.query('SELECT sale_id FROM sales WHERE user_id = ?', [pakiyId]);
        
        if (sales.length > 0) {
            for (const s of sales) {
                const [items] = await db.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', [s.sale_id]);
                for (const item of items) {
                    // Restore inventory
                    await db.query(
                        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
                        [item.quantity, item.product_id]
                    );
                }
            }
            // Delete sales (sale_items will cascade)
            await db.query('DELETE FROM sales WHERE user_id = ?', [pakiyId]);
            // Delete stock_logs for pakiy
            await db.query('DELETE FROM stock_logs WHERE user_id = ?', [pakiyId]);
            console.log(`Reverted ${sales.length} sales.`);
        }

        // ==========================================
        // FIX STOCK IN DATES
        // ==========================================
        console.log('Fixing stock_in dates...');
        // We want Thailand time: 2026-08-31 22:00:00 - 23:00:00
        // UTC time: 2026-08-31 15:00:00 - 16:00:00
        const [stockInRows] = await db.query('SELECT stock_in_id FROM stock_in');
        for (const row of stockInRows) {
            const randomMin = Math.floor(Math.random() * 60);
            const randomSec = Math.floor(Math.random() * 60);
            // using 15 for UTC hour to map to 22 in TH
            const dateStr = `2026-08-31 15:${randomMin.toString().padStart(2, '0')}:${randomSec.toString().padStart(2, '0')}`;
            const randomAdmin = validAdmins[Math.floor(Math.random() * validAdmins.length)];
            
            await db.query(
                'UPDATE stock_in SET created_at = ?, user_id = ? WHERE stock_in_id = ?',
                [dateStr, randomAdmin, row.stock_in_id]
            );
        }
        console.log(`Fixed ${stockInRows.length} stock_in records.`);

        // ==========================================
        // GENERATE NEW SALES (Sequential & Correct Time)
        // ==========================================
        console.log('Generating new sales...');
        const numSales = Math.floor(Math.random() * 11) + 30; // 30-40 sales
        
        // Generate timestamps
        const timestamps = [];
        for (let i = 0; i < numSales; i++) {
            // TH Time: 06:00 - 23:00 => UTC: previous day 23:00 to today 16:00
            // That's 17 hours total. Let's just generate a random offset in seconds
            // 06:00 TH = 23:00 UTC (previous day)
            const minTime = new Date('2026-08-31T23:00:00Z').getTime(); 
            const maxTime = new Date('2026-09-01T15:59:59Z').getTime();
            
            const randomTime = minTime + Math.random() * (maxTime - minTime);
            timestamps.push(randomTime);
        }
        // SORT chronologically so receipt numbers are sequential with time!
        timestamps.sort((a, b) => a - b);
        
        // Fetch products grouped by category
        const [products] = await db.query('SELECT product_id, category_id, price FROM products');
        const productsByCat = {};
        products.forEach(p => {
            if (!productsByCat[p.category_id]) productsByCat[p.category_id] = [];
            productsByCat[p.category_id].push(p);
        });

        const categoryWeights = [
            { catId: 2, weight: 40 }, // อาหารและขนม
            { catId: 1, weight: 40 }, // เครื่องดื่ม
            { catId: 4, weight: 10 }, // ของใช้
            { catId: 3, weight: 9 },  // เครื่องปรุงและส่วนผสม
            { catId: 5, weight: 1 }   // ยาสามัญประจำบ้าน
        ];

        function getRandomProduct() {
            let totalWeight = 0;
            const availableWeights = categoryWeights.filter(cw => productsByCat[cw.catId] && productsByCat[cw.catId].length > 0);
            availableWeights.forEach(cw => totalWeight += cw.weight);
            if (totalWeight === 0) return products[Math.floor(Math.random() * products.length)];
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

        for (const ts of timestamps) {
            const dateObj = new Date(ts);
            // Format to YYYY-MM-DD HH:MM:SS in UTC for MySQL
            const saleDateStr = dateObj.toISOString().slice(0, 19).replace('T', ' ');
            
            const numItems = Math.floor(Math.random() * 4) + 1;
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
        
        console.log(`Successfully regenerated ${numSales} ordered sales for user pakiy.`);
        process.exit(0);

    } catch (error) {
        console.error('Error during fix:', error);
        process.exit(1);
    }
}

fixSimulation();
