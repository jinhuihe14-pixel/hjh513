const express = require('express');
const router = express.Router();
const { all, run, get } = require('../database/db');

function generateOrderNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${dateStr}${random}`;
}

router.get('/orders', async (req, res) => {
  try {
    const { start_date, end_date, salesperson_id, order_type } = req.query;
    let sql = `
      SELECT ro.*, e.name as salesperson_name
      FROM retail_orders ro
      LEFT JOIN employees e ON ro.salesperson_id = e.id
      WHERE 1=1
    `;
    const params = [];
    
    if (start_date) {
      sql += ' AND ro.order_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND ro.order_date <= ?';
      params.push(end_date);
    }
    if (salesperson_id) {
      sql += ' AND ro.salesperson_id = ?';
      params.push(salesperson_id);
    }
    if (order_type) {
      sql += ' AND ro.order_type = ?';
      params.push(order_type);
    }
    
    sql += ' ORDER BY ro.order_date DESC, ro.created_at DESC';
    const orders = await all(sql, params);
    res.json(orders);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const order = await get(`
      SELECT ro.*, e.name as salesperson_name
      FROM retail_orders ro
      LEFT JOIN employees e ON ro.salesperson_id = e.id
      WHERE ro.id = ?
    `, [id]);
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    const items = await all(`
      SELECT roi.*, fp.name as product_name, fp.unit
      FROM retail_order_items roi
      LEFT JOIN finished_products fp ON roi.product_id = fp.id
      WHERE roi.order_id = ?
    `, [id]);
    
    res.json({ ...order, items });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/orders', async (req, res) => {
  const { order_date, salesperson_id, order_type, customer_name, customer_phone, remark, items } = req.body;
  
  try {
    const order_no = generateOrderNo();
    let total_amount = 0;
    items.forEach(item => {
      total_amount += item.quantity * item.unit_price;
    });
    
    for (const item of items) {
      const product = await get('SELECT current_stock, is_gift_box FROM finished_products WHERE id = ?', [item.product_id]);
      
      if (!product) {
        return res.status(400).json({ error: `产品不存在: ${item.product_id}` });
      }
      
      if (product.current_stock < item.quantity) {
        return res.status(400).json({ error: `产品库存不足` });
      }
    }
    
    const orderResult = await run(
      `INSERT INTO retail_orders 
       (order_no, order_date, salesperson_id, total_amount, order_type, customer_name, customer_phone, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_no, order_date, salesperson_id, total_amount, order_type || 'retail', customer_name, customer_phone, remark]
    );
    
    const orderId = orderResult.lastID;
    
    for (const item of items) {
      const product = await get('SELECT current_stock, is_gift_box FROM finished_products WHERE id = ?', [item.product_id]);
      const subtotal = item.quantity * item.unit_price;
      
      await run(
        'INSERT INTO retail_order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.unit_price, subtotal]
      );
      
      await run(
        'UPDATE finished_products SET current_stock = current_stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
      
      if (product.is_gift_box) {
        const giftBoxItems = await all(`
          SELECT product_id, quantity
          FROM gift_box_items
          WHERE gift_box_id = ?
        `, [item.product_id]);
        
        for (const gbItem of giftBoxItems) {
          const deductQty = item.quantity * gbItem.quantity;
          await run(
            'UPDATE finished_products SET current_stock = current_stock - ? WHERE id = ?',
            [deductQty, gbItem.product_id]
          );
        }
      }
    }
    
    res.json({ success: true, order_no, total_amount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/orders/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const items = await all(`
      SELECT roi.product_id, roi.quantity, fp.is_gift_box
      FROM retail_order_items roi
      LEFT JOIN finished_products fp ON roi.product_id = fp.id
      WHERE roi.order_id = ?
    `, [id]);
    
    for (const item of items) {
      await run(
        'UPDATE finished_products SET current_stock = current_stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
      
      if (item.is_gift_box) {
        const giftBoxItems = await all(`
          SELECT product_id, quantity
          FROM gift_box_items
          WHERE gift_box_id = ?
        `, [item.product_id]);
        
        for (const gbItem of giftBoxItems) {
          const addQty = item.quantity * gbItem.quantity;
          await run(
            'UPDATE finished_products SET current_stock = current_stock + ? WHERE id = ?',
            [addQty, gbItem.product_id]
          );
        }
      }
    }
    
    await run('DELETE FROM retail_order_items WHERE order_id = ?', [id]);
    await run('DELETE FROM retail_orders WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/daily-sales-summary', async (req, res) => {
  try {
    const { date } = req.query;
    const summaryDate = date || new Date().toISOString().split('T')[0];
    
    const salesByPerson = await all(`
      SELECT 
        salesperson_id,
        e.name as salesperson_name,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales,
        SUM(CASE WHEN order_type = 'retail' THEN total_amount ELSE 0 END) as retail_sales,
        SUM(CASE WHEN order_type = 'wholesale' THEN total_amount ELSE 0 END) as wholesale_sales
      FROM retail_orders ro
      LEFT JOIN employees e ON ro.salesperson_id = e.id
      WHERE ro.order_date = ?
      GROUP BY salesperson_id
    `, [summaryDate]);
    
    res.json({ date: summaryDate, records: salesByPerson });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
