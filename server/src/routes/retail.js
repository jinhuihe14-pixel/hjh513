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
    const { start_date, end_date, salesperson_id, order_type, member_level } = req.query;
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
    if (member_level) {
      sql += ' AND ro.member_level = ?';
      params.push(member_level);
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

const MEMBER_DISCOUNTS = {
  normal: 1.0,
  silver: 0.95,
  gold: 0.9
};

function calculateUnitPrice(product, orderType, memberLevel) {
  if (orderType === 'wholesale') {
    return product.wholesale_price || product.retail_price;
  }
  
  if (product.is_gift_box) {
    return product.retail_price;
  }
  
  const discount = MEMBER_DISCOUNTS[memberLevel] || 1.0;
  return Math.round(product.retail_price * discount * 100) / 100;
}

router.post('/orders', async (req, res) => {
  const { order_date, salesperson_id, order_type, member_level, customer_name, customer_phone, remark, items } = req.body;
  
  try {
    const order_no = generateOrderNo();
    const actualMemberLevel = order_type === 'wholesale' ? 'normal' : (member_level || 'normal');
    const safeCustomerName = customer_name || null;
    const safeCustomerPhone = customer_phone || null;
    const safeRemark = remark || null;
    
    let total_amount = 0;
    const processedItems = [];
    
    for (const item of items) {
      const product = await get('SELECT * FROM finished_products WHERE id = ?', [item.product_id]);
      
      if (!product) {
        return res.status(400).json({ error: `产品不存在: ${item.product_id}` });
      }
      
      if (product.current_stock < item.quantity) {
        return res.status(400).json({ error: `产品库存不足` });
      }
      
      const unitPrice = calculateUnitPrice(product, order_type, actualMemberLevel);
      const subtotal = Math.round(item.quantity * unitPrice * 100) / 100;
      total_amount += subtotal;
      
      processedItems.push({
        ...item,
        unit_price: unitPrice,
        subtotal: subtotal,
        product
      });
    }
    
    const orderResult = await run(
      `INSERT INTO retail_orders 
       (order_no, order_date, salesperson_id, total_amount, order_type, member_level, customer_name, customer_phone, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_no, order_date, salesperson_id, total_amount, order_type || 'retail', actualMemberLevel, safeCustomerName, safeCustomerPhone, safeRemark]
    );
    
    const orderId = orderResult.lastID;
    
    for (const item of processedItems) {
      await run(
        'INSERT INTO retail_order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.unit_price, item.subtotal]
      );
      
      await run(
        'UPDATE finished_products SET current_stock = current_stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
      
      if (item.product.is_gift_box) {
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
    
    res.json({ success: true, order_no, total_amount, member_level: actualMemberLevel });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/orders/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const order = await get(`
      SELECT * FROM retail_orders WHERE id = ?
    `, [id]);
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
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
    
    const dailySummary = await get(`
      SELECT * FROM salary_daily_summary 
      WHERE summary_date = ? AND employee_id = ?
    `, [order.order_date, order.salesperson_id]);
    
    if (dailySummary) {
      const config = await all('SELECT * FROM salary_config WHERE is_active = 1');
      const retailCommissionConfig = config.find(c => c.role === 'salesperson' && c.config_type === 'retail_commission');
      const wholesaleCommissionConfig = config.find(c => c.role === 'salesperson' && c.config_type === 'wholesale_commission');
      
      const retailCommissionRate = retailCommissionConfig ? parseFloat(retailCommissionConfig.config_value) : 0.02;
      const wholesaleCommissionRate = wholesaleCommissionConfig ? parseFloat(wholesaleCommissionConfig.config_value) : 0.01;
      
      let retailSalesDeduct = 0;
      let wholesaleSalesDeduct = 0;
      let retailCommissionDeduct = 0;
      let wholesaleCommissionDeduct = 0;
      
      if (order.order_type === 'retail') {
        retailSalesDeduct = order.total_amount;
        retailCommissionDeduct = order.total_amount * retailCommissionRate;
      } else {
        wholesaleSalesDeduct = order.total_amount;
        wholesaleCommissionDeduct = order.total_amount * wholesaleCommissionRate;
      }
      
      const newRetailSales = Math.max(0, (dailySummary.retail_sales || 0) - retailSalesDeduct);
      const newWholesaleSales = Math.max(0, (dailySummary.wholesale_sales || 0) - wholesaleSalesDeduct);
      const newRetailCommission = Math.max(0, (dailySummary.retail_commission || 0) - retailCommissionDeduct);
      const newWholesaleCommission = Math.max(0, (dailySummary.wholesale_commission || 0) - wholesaleCommissionDeduct);
      const newTotalCommission = Math.max(0, newRetailCommission + newWholesaleCommission);
      
      await run(`
        UPDATE salary_daily_summary 
        SET retail_sales = ?, wholesale_sales = ?, 
            retail_commission = ?, wholesale_commission = ?, 
            total_commission = ?
        WHERE id = ?
      `, [newRetailSales, newWholesaleSales, 
           newRetailCommission, newWholesaleCommission, 
           newTotalCommission, dailySummary.id]);
    }
    
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
