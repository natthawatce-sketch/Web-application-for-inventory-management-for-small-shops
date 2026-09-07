const db = require('./db');

async function test() {
    const sql = `SELECT DATE_FORMAT(sale_date, '%a') as label, SUM(total_price) as revenue FROM sales WHERE sale_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY label ORDER BY MIN(sale_date) ASC`;
    const [rows] = await db.query(sql);
    console.log('Query result:');
    console.log(rows);
    
    if (rows.length > 0) {
        const maxRevenue = Math.max(...rows.map(r => Number(r.revenue)), 1);
        console.log('maxRevenue:', maxRevenue);
        const chartData = rows.map(r => ({
            label: r.label,
            revenue: r.revenue,
            percent: Math.max((Number(r.revenue) / maxRevenue) * 100, 5)
        }));
        console.log('chartData:', chartData);
    }
    
    process.exit(0);
}
test();
