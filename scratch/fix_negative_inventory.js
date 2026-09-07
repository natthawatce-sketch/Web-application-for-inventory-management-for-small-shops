const db = require('../backend/db');

async function fixNegativeInventory() {
    try {
        console.log('Starting to fix negative inventory...');
        
        // Find valid admin user for stock in
        const [userRows] = await db.query("SELECT user_id FROM users WHERE username IN ('admin', 'adminmap', 'pakiy')");
        if (userRows.length === 0) {
            throw new Error('Could not find user');
        }
        const adminId = userRows[0].user_id;

        // Find products with quantity < 20 (including negative)
        const [inventoryRows] = await db.query('SELECT product_id, quantity FROM inventory WHERE quantity < 20');
        
        let fixedCount = 0;
        
        for (const row of inventoryRows) {
            // Target stock to replenish up to 100
            const amountToAdd = 100 - row.quantity;
            
            // Randomize stock in date between Sept 2 and Sept 6
            const minTime = new Date('2026-09-02T00:00:00Z').getTime(); 
            const maxTime = new Date('2026-09-06T12:00:00Z').getTime();
            const randomTime = minTime + Math.random() * (maxTime - minTime);
            const dateObj = new Date(randomTime);
            const stockInDateStr = dateObj.toISOString().slice(0, 19).replace('T', ' ');

            // 1. Update inventory
            await db.query(
                'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
                [amountToAdd, row.product_id]
            );
            
            // 2. Insert stock_in
            await db.query(
                'INSERT INTO stock_in (product_id, quantity, user_id, created_at) VALUES (?, ?, ?, ?)',
                [row.product_id, amountToAdd, adminId, stockInDateStr]
            );
            
            // 3. Insert stock_logs ('เพิ่ม')
            await db.query(
                "INSERT INTO stock_logs (product_id, user_id, action, quantity, log_date) VALUES (?, ?, 'เพิ่ม', ?, ?)",
                [row.product_id, adminId, amountToAdd, stockInDateStr]
            );
            
            fixedCount++;
        }
        
        console.log(`Successfully fixed and restocked ${fixedCount} products.`);
        process.exit(0);

    } catch (error) {
        console.error('Error during generation:', error);
        process.exit(1);
    }
}

fixNegativeInventory();
