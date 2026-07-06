const db = require('./db');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const sql = 'SELECT * FROM users WHERE (username = ? OR email = ?) AND status = "active"';
    const [results] = await db.query(sql, ['admin@shop.com', 'admin@shop.com']);
    console.log(results[0]);
    const isMatch = await bcrypt.compare('123', results[0].password);
    console.log('isMatch:', isMatch);
  } catch (e) {
    console.error('ERROR OCCURRED:', e);
  } finally {
    process.exit(0);
  }
})();
