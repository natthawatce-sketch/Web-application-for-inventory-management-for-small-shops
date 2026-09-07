const db = require('../backend/db');

async function fixBills() {
    try {
        console.log('Starting bill fix...');

        // 1. REVERT the fake stock ins
        console.log('Reverting fake stock ins...');
        const [fakeStockIns] = await db.query('SELECT product_id, quantity FROM stock_in WHERE stock_in_id >= 569');
        for (const row of fakeStockIns) {
            await db.query('UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?', [row.quantity, row.product_id]);
        }
        await db.query('DELETE FROM stock_in WHERE stock_in_id >= 569');
        await db.query("DELETE FROM stock_logs WHERE action = 'เพิ่ม' AND log_id >= 1633");
        console.log(`Reverted ${fakeStockIns.length} fake stock ins.`);

        // 2. Identify products that are STILL negative
        const [negativeInventory] = await db.query('SELECT product_id, quantity FROM inventory WHERE quantity < 0');
        console.log(`Found ${negativeInventory.length} products with negative inventory to fix.`);

        const [pakiyRow] = await db.query("SELECT user_id FROM users WHERE username = 'pakiy'");
        const pakiyId = pakiyRow[0].user_id;

        // Fetch all products that have positive inventory to use as replacements
        const [positiveProducts] = await db.query('SELECT i.product_id, p.price, i.quantity FROM inventory i JOIN products p ON i.product_id = p.product_id WHERE i.quantity > 20'); 
        
        for (const neg of negativeInventory) {
            let deficit = Math.abs(neg.quantity);
            const productId = neg.product_id;

            // Find all sale_items for this product by pakiy
            const [saleItems] = await db.query(`
                SELECT si.sale_item_id, si.sale_id, si.quantity, si.price 
                FROM sale_items si 
                JOIN sales s ON si.sale_id = s.sale_id 
                WHERE si.product_id = ? AND s.user_id = ?
            `, [productId, pakiyId]);

            let i = 0;
            while (deficit > 0 && i < saleItems.length) {
                const item = saleItems[i];
                const toTake = Math.min(deficit, item.quantity);
                
                // Update sale_item or delete it
                if (toTake === item.quantity) {
                    await db.query('DELETE FROM sale_items WHERE sale_item_id = ?', [item.sale_item_id]);
                } else {
                    await db.query('UPDATE sale_items SET quantity = quantity - ? WHERE sale_item_id = ?', [toTake, item.sale_item_id]);
                }

                // Update inventory for the removed item
                await db.query('UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?', [toTake, productId]);

                // Replace them with a POSITIVE product.
                for (let k = 0; k < toTake; k++) {
                    const replacement = positiveProducts[Math.floor(Math.random() * positiveProducts.length)];
                    
                    const [existingItem] = await db.query('SELECT sale_item_id, quantity FROM sale_items WHERE sale_id = ? AND product_id = ?', [item.sale_id, replacement.product_id]);
                    
                    if (existingItem.length > 0) {
                        await db.query('UPDATE sale_items SET quantity = quantity + 1 WHERE sale_item_id = ?', [existingItem[0].sale_item_id]);
                    } else {
                        await db.query('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, 1, ?)', [item.sale_id, replacement.product_id, replacement.price]);
                    }

                    await db.query('UPDATE inventory SET quantity = quantity - 1 WHERE product_id = ?', [replacement.product_id]);
                    replacement.quantity -= 1; // local cache update
                }

                deficit -= toTake;
                i++;
            }
        }

        console.log('Fixed negative sale items.');

        // 3. Recalculate all sales totals for pakiy
        console.log('Recalculating sales totals...');
        const [sales] = await db.query('SELECT sale_id FROM sales WHERE user_id = ?', [pakiyId]);
        for (const s of sales) {
            const [items] = await db.query('SELECT quantity, price FROM sale_items WHERE sale_id = ?', [s.sale_id]);
            let total = 0;
            items.forEach(i => total += i.quantity * parseFloat(i.price));
            await db.query('UPDATE sales SET total_price = ? WHERE sale_id = ?', [total, s.sale_id]);
        }

        // 4. Regenerate stock_logs for pakiy (cleanest way)
        console.log('Regenerating stock_logs for pakiy...');
        await db.query("DELETE FROM stock_logs WHERE user_id = ? AND action = 'ลด'", [pakiyId]);
        
        for (const s of sales) {
            const [saleRows] = await db.query('SELECT sale_date FROM sales WHERE sale_id = ?', [s.sale_id]);
            // Format for MySQL
            const dateObj = new Date(saleRows[0].sale_date);
            const yyyy = dateObj.getUTCFullYear();
            const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getUTCDate()).padStart(2, '0');
            const hh = String(dateObj.getUTCHours()).padStart(2, '0');
            const min = String(dateObj.getUTCMinutes()).padStart(2, '0');
            const sec = String(dateObj.getUTCSeconds()).padStart(2, '0');
            const saleDateStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;

            const [items] = await db.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', [s.sale_id]);
            for (const item of items) {
                await db.query(
                    "INSERT INTO stock_logs (product_id, user_id, action, quantity, log_date) VALUES (?, ?, 'ลด', ?, ?)",
                    [item.product_id, pakiyId, item.quantity, saleDateStr]
                );
            }
        }

        console.log('Completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fixBills();
