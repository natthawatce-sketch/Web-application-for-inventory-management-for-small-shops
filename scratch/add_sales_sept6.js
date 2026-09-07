const db = require('../backend/db');

async function addSalesSept6() {
    try {
        console.log('Starting to add sales for Sept 6...');
        
        // Find user pakiy
        const [userRows] = await db.query("SELECT user_id, username FROM users WHERE username = 'pakiy'");
        if (userRows.length === 0) {
            throw new Error('Could not find pakiy user');
        }
        const pakiyId = userRows[0].user_id;

        const numSales = Math.floor(Math.random() * 21) + 40; // 40-60 sales
        console.log(`Generating ${numSales} sales...`);
        
        // Generate timestamps for Sept 6, 06:00 - 23:00 (TH Time)
        // UTC: 2026-09-05 23:00:00 to 2026-09-06 15:59:59
        const timestamps = [];
        const minTime = new Date('2026-09-05T23:00:00Z').getTime(); 
        const maxTime = new Date('2026-09-06T15:59:59Z').getTime();
        
        for (let i = 0; i < numSales; i++) {
            const randomTime = minTime + Math.random() * (maxTime - minTime);
            timestamps.push(randomTime);
        }
        timestamps.sort((a, b) => a - b); // chronologically sorted
        
        const [products] = await db.query('SELECT product_id, category_id, price, product_name FROM products');
        const productsByCat = {};
        
        products.forEach(p => {
            if (!productsByCat[p.category_id]) productsByCat[p.category_id] = [];
            
            // Weighting
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

        function getRandomProduct(weights) {
            let totalWeight = 0;
            const availableWeights = weights.filter(cw => productsByCat[cw.catId] && productsByCat[cw.catId].length > 0);
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
            const thTime = new Date(ts + 7 * 3600 * 1000);
            const thHour = thTime.getUTCHours();
            
            const dateObj = new Date(ts);
            const saleDateStr = dateObj.toISOString().slice(0, 19).replace('T', ' ');
            
            const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 distinct items
            const cartItems = [];
            let totalPrice = 0;
            
            const weights = getWeightsForHour(thHour);
            
            for (let j = 0; j < numItems; j++) {
                const prod = getRandomProduct(weights);
                // Quantity 1 to 6
                const qty = Math.floor(Math.random() * 6) + 1; 
                
                const existing = cartItems.find(item => item.product_id === prod.product_id);
                if (existing) {
                    existing.quantity += qty;
                    totalPrice += parseFloat(prod.price) * qty;
                } else {
                    cartItems.push({
                        product_id: prod.product_id,
                        quantity: qty,
                        price: parseFloat(prod.price)
                    });
                    totalPrice += parseFloat(prod.price) * qty;
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
        
        console.log(`Successfully generated ${numSales} sales for Sept 6.`);
        process.exit(0);

    } catch (error) {
        console.error('Error during generation:', error);
        process.exit(1);
    }
}

addSalesSept6();
