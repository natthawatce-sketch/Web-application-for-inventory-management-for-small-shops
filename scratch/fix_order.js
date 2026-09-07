const db = require('../backend/db');

async function fixOrder() {
    try {
        console.log('Fixing sale_date order for Sept 2...');
        
        // Fetch all sales for Sept 2 (sale_id >= 40) ordered by sale_id
        const [sales] = await db.query('SELECT sale_id FROM sales WHERE sale_id >= 40 ORDER BY sale_id ASC');
        
        const numSales = sales.length;
        console.log(`Found ${numSales} sales to reorder (IDs 40 to ${sales[sales.length - 1].sale_id}).`);

        // Generate timestamps for Sept 2, 06:00 - 23:00 (TH Time)
        // UTC: 2026-09-01 23:00:00 to 2026-09-02 15:59:59
        const timestamps = [];
        const minTime = new Date('2026-09-01T23:00:00Z').getTime(); 
        const maxTime = new Date('2026-09-02T15:59:59Z').getTime();
        
        for (let i = 0; i < numSales; i++) {
            const randomTime = minTime + Math.random() * (maxTime - minTime);
            timestamps.push(randomTime);
        }
        timestamps.sort((a, b) => a - b); // chronologically sorted
        
        // Update each sale with the new sequential timestamp
        for (let i = 0; i < numSales; i++) {
            const saleId = sales[i].sale_id;
            const ts = timestamps[i];
            
            const dateObj = new Date(ts);
            const saleDateStr = dateObj.toISOString().slice(0, 19).replace('T', ' ');
            
            await db.query('UPDATE sales SET sale_date = ? WHERE sale_id = ?', [saleDateStr, saleId]);
            
            // Also update stock_logs just in case, though it's not strictly necessary for ordering in the UI
            // but keeps data consistent
            await db.query("UPDATE stock_logs SET log_date = ? WHERE action = 'ลด' AND log_date >= '2026-09-01 23:00:00' AND user_id = (SELECT user_id FROM sales WHERE sale_id = ?)", [saleDateStr, saleId]);
        }
        
        console.log('Successfully reordered timestamps so sale_id matches chronological order.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixOrder();
