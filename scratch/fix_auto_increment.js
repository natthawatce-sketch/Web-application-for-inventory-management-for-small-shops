const db = require('../backend/db');

async function fixAutoIncrement() {
    try {
        console.log('Starting full reset of sales...');
        
        // Find users
        const [userRows] = await db.query("SELECT user_id, username FROM users WHERE username = 'pakiy'");
        if (userRows.length === 0) {
            throw new Error('Could not find pakiy user');
        }
        const pakiyId = userRows[0].user_id;

        // 1. Restore all inventory from all existing sales
        const [allSales] = await db.query('SELECT sale_id FROM sales');
        console.log(`Found ${allSales.length} existing sales to revert.`);
        
        if (allSales.length > 0) {
            for (const s of allSales) {
                const [items] = await db.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', [s.sale_id]);
                for (const item of items) {
                    await db.query(
                        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
                        [item.quantity, item.product_id]
                    );
                }
            }
        }
        
        // 2. Delete all sales and reset auto_increment
        await db.query('DELETE FROM sale_items');
        await db.query('ALTER TABLE sale_items AUTO_INCREMENT = 1');
        
        await db.query('DELETE FROM sales');
        await db.query('ALTER TABLE sales AUTO_INCREMENT = 1');
        
        // Also remove stock_logs related to sales ('ลด')
        // We assume 'ลด' is only from sales in this simulation context.
        await db.query("DELETE FROM stock_logs WHERE action = 'ลด'");
        
        console.log('Cleared all sales and reset auto_increment to 1.');

        // 3. Generate exactly 39 new sales
        console.log('Generating exactly 39 sales...');
        const numSales = 39;
        
        // Generate timestamps
        const timestamps = [];
        for (let i = 0; i < numSales; i++) {
            const minTime = new Date('2026-08-31T23:00:00Z').getTime(); 
            const maxTime = new Date('2026-09-01T15:59:59Z').getTime();
            const randomTime = minTime + Math.random() * (maxTime - minTime);
            timestamps.push(randomTime);
        }
        timestamps.sort((a, b) => a - b); // sort chronologically
        
        const [products] = await db.query('SELECT product_id, category_id, price FROM products');
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
        
        console.log(`Successfully generated 39 ordered sales numbered 1 to 39.`);
        process.exit(0);

    } catch (error) {
        console.error('Error during fix:', error);
        process.exit(1);
    }
}

fixAutoIncrement();
