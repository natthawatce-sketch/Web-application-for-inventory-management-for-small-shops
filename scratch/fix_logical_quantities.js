const db = require('../backend/db');

async function fixLogicalQuantities() {
    try {
        console.log('Starting logical quantity fix...');

        const [pakiyRow] = await db.query("SELECT user_id FROM users WHERE username = 'pakiy'");
        const pakiyId = pakiyRow[0].user_id;

        // Fetch all sale items by pakiy
        const [saleItems] = await db.query(`
            SELECT si.sale_item_id, si.sale_id, si.product_id, si.quantity, si.price, p.category_id, p.product_name 
            FROM sale_items si 
            JOIN sales s ON si.sale_id = s.sale_id 
            JOIN products p ON si.product_id = p.product_id
            WHERE s.user_id = ?
        `, [pakiyId]);

        let itemsFixed = 0;
        let totalReducedValue = 0;

        for (const item of saleItems) {
            const name = item.product_name.toLowerCase();
            let maxLogicalQty = 1;

            if (item.category_id === 1) { // Drinks
                if (name.includes('ช้าง') || name.includes('สิงห์') || name.includes('ลีโอ') || name.includes('leo') || name.includes('เบียร์') || name.includes('beer') || name.includes('alcohol')) {
                    maxLogicalQty = 6; // Beer can be bought in bulk
                } else if (name.includes('น้ำเปล่า') || name.includes('น้ำดื่ม') || name.includes('โค้ก') || name.includes('เป๊ปซี่') || name.includes('สไปรท์')) {
                    maxLogicalQty = 4; // Packs of water/soda
                } else {
                    maxLogicalQty = 2; // Other drinks (milk, tea, coffee)
                }
            } else if (item.category_id === 2) { // Food & Snacks
                maxLogicalQty = 3; 
            } else if (item.category_id === 3) { // Condiments
                maxLogicalQty = 1; 
            } else if (item.category_id === 4) { // Household (ไฟแช็ค, etc)
                maxLogicalQty = 1; 
            } else if (item.category_id === 5) { // Medicine
                maxLogicalQty = 1; 
            }

            if (item.quantity > maxLogicalQty) {
                // Determine new quantity (random between 1 and maxLogicalQty, but weighted towards max)
                // Actually, to keep it simple, just set it to maxLogicalQty
                const newQty = maxLogicalQty;
                const reduceQty = item.quantity - newQty;

                // 1. Update sale_item
                await db.query('UPDATE sale_items SET quantity = ? WHERE sale_item_id = ?', [newQty, item.sale_item_id]);

                // 2. Restore inventory
                await db.query('UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?', [reduceQty, item.product_id]);

                // 3. Keep track of money to subtract from sales.total_price
                totalReducedValue += (reduceQty * parseFloat(item.price));

                itemsFixed++;
            }
        }

        console.log(`Reduced illogical quantities on ${itemsFixed} sale items.`);

        // Recalculate sales totals to be perfectly accurate
        console.log('Recalculating all sales totals...');
        const [sales] = await db.query('SELECT sale_id FROM sales WHERE user_id = ?', [pakiyId]);
        for (const s of sales) {
            const [items] = await db.query('SELECT quantity, price FROM sale_items WHERE sale_id = ?', [s.sale_id]);
            let total = 0;
            items.forEach(i => total += i.quantity * parseFloat(i.price));
            await db.query('UPDATE sales SET total_price = ? WHERE sale_id = ?', [total, s.sale_id]);
        }

        // Regenerate stock_logs for pakiy (ONLY action = 'ลด' representing sales)
        console.log('Regenerating stock logs for pakiy sales...');
        await db.query("DELETE FROM stock_logs WHERE user_id = ? AND action = 'ลด'", [pakiyId]);
        
        for (const s of sales) {
            const [saleRows] = await db.query('SELECT sale_date FROM sales WHERE sale_id = ?', [s.sale_id]);
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

        console.log('Completed logical quantity fixes!');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixLogicalQuantities();
