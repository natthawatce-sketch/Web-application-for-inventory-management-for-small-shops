const db = require('../backend/db');

async function addSalesSept7() {
    try {
        console.log('Starting to add sales for Sept 7...');
        
        // Find user pakiy
        const [userRows] = await db.query("SELECT user_id, username FROM users WHERE username = 'pakiy'");
        if (userRows.length === 0) {
            throw new Error('Could not find pakiy user');
        }
        const pakiyId = userRows[0].user_id;

        const numSales = Math.floor(Math.random() * 21) + 40; // 40-60 sales
        console.log(`Generating ${numSales} sales...`);
        
        // Generate timestamps for Sept 7, 06:00 - 23:00 (TH Time)
        // UTC: 2026-09-06 23:00:00 to 2026-09-07 15:59:59
        const timestamps = [];
        const minTime = new Date('2026-09-06T23:00:00Z').getTime(); 
        const maxTime = new Date('2026-09-07T15:59:59Z').getTime();
        
        for (let i = 0; i < numSales; i++) {
            const randomTime = minTime + Math.random() * (maxTime - minTime);
            timestamps.push(randomTime);
        }
        timestamps.sort((a, b) => a - b); // chronologically sorted
        
        // 1. Fetch current inventory and filter out products restocked on Sept 7 (TH Time)
        // A product restocked on Sept 7 cannot be sold on Sept 7.
        // We will maintain a local inventory state to avoid querying DB every time.
        const [inventoryRows] = await db.query(`
            SELECT p.product_id, p.category_id, p.price, p.product_name, i.quantity 
            FROM products p 
            JOIN inventory i ON p.product_id = i.product_id 
            WHERE i.quantity > 0 
            AND p.product_id NOT IN (
                SELECT product_id 
                FROM stock_in 
                WHERE DATE(DATE_ADD(created_at, INTERVAL 7 HOUR)) >= '2026-09-07'
            )
        `);

        // Local cache of inventory
        const availableProducts = inventoryRows.map(r => ({ ...r, price: parseFloat(r.price) }));
        
        function getWeightsForHour(hour) {
            if (hour >= 6 && hour < 10) {
                return [
                    { catId: 1, weight: 55 },
                    { catId: 2, weight: 40 },
                    { catId: 4, weight: 3 }, 
                    { catId: 3, weight: 1 }, 
                    { catId: 5, weight: 1 }  
                ];
            } else if (hour >= 10 && hour < 16) {
                return [
                    { catId: 1, weight: 50 },
                    { catId: 2, weight: 45 },
                    { catId: 4, weight: 3 }, 
                    { catId: 3, weight: 1 },  
                    { catId: 5, weight: 1 }   
                ];
            } else if (hour >= 16 && hour < 20) {
                return [
                    { catId: 1, weight: 40 },
                    { catId: 3, weight: 30 },
                    { catId: 2, weight: 20 },
                    { catId: 4, weight: 8 }, 
                    { catId: 5, weight: 2 }   
                ];
            } else {
                return [
                    { catId: 1, weight: 50 },
                    { catId: 2, weight: 40 },
                    { catId: 4, weight: 5 }, 
                    { catId: 5, weight: 4 },  
                    { catId: 3, weight: 1 }   
                ];
            }
        }

        // Helper to pick a product
        function getRandomProduct(thHour) {
            // Re-build productsByCat from current availableProducts that have quantity > 0
            const productsByCat = {};
            availableProducts.forEach(p => {
                if (p.quantity <= 0) return;
                
                if (!productsByCat[p.category_id]) productsByCat[p.category_id] = [];
                
                // Weighting logic
                const name = p.product_name.toLowerCase();
                let instances = 1;
                
                if (p.category_id === 1) { // Drinks
                    if (name.includes('ช้าง') || name.includes('สิงห์') || name.includes('ลีโอ') || name.includes('leo') || name.includes('เบียร์') || name.includes('beer') || name.includes('alcohol')) {
                        instances = 5; 
                    } else if (name.includes('น้ำ') || name.includes('โค้ก') || name.includes('โออิชิ') || name.includes('เป๊ปซี่') || name.includes('น้ำเปล่า')) {
                        instances = 3; 
                    }
                } else if (p.category_id === 2) { // Food/Snacks
                    instances = 2; 
                }
                
                for (let k = 0; k < instances; k++) {
                    productsByCat[p.category_id].push(p);
                }
            });

            const weights = getWeightsForHour(thHour);
            let totalWeight = 0;
            const availableWeights = weights.filter(cw => productsByCat[cw.catId] && productsByCat[cw.catId].length > 0);
            availableWeights.forEach(cw => totalWeight += cw.weight);
            
            if (totalWeight === 0) {
                // fallback to any available product
                const validProducts = availableProducts.filter(p => p.quantity > 0);
                if (validProducts.length === 0) return null;
                return validProducts[Math.floor(Math.random() * validProducts.length)];
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

        for (const ts of timestamps) {
            const thTime = new Date(ts + 7 * 3600 * 1000);
            const thHour = thTime.getUTCHours();
            
            const dateObj = new Date(ts);
            const saleDateStr = dateObj.toISOString().slice(0, 19).replace('T', ' ');
            
            const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 distinct items
            const cartItems = [];
            let totalPrice = 0;
            
            for (let j = 0; j < numItems; j++) {
                const prod = getRandomProduct(thHour);
                if (!prod) break; // Out of stock entirely!
                
                // Max quantity is either 6 or the remaining inventory
                let maxQty = Math.min(6, prod.quantity);
                if (maxQty <= 0) continue;
                
                const qty = Math.floor(Math.random() * maxQty) + 1; 
                
                const existing = cartItems.find(item => item.product_id === prod.product_id);
                if (existing) {
                    // Make sure adding doesn't exceed inventory
                    const addQty = Math.min(qty, prod.quantity);
                    if (addQty > 0) {
                        existing.quantity += addQty;
                        totalPrice += prod.price * addQty;
                        prod.quantity -= addQty; // deduct from local cache
                    }
                } else {
                    cartItems.push({
                        product_id: prod.product_id,
                        quantity: qty,
                        price: prod.price
                    });
                    totalPrice += prod.price * qty;
                    prod.quantity -= qty; // deduct from local cache
                }
            }
            
            if (cartItems.length === 0) continue; // Skip empty bills

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
        
        console.log(`Successfully generated ${numSales} sales for Sept 7 with strict inventory checks.`);
        process.exit(0);

    } catch (error) {
        console.error('Error during generation:', error);
        process.exit(1);
    }
}

addSalesSept7();
