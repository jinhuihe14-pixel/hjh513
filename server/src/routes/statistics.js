const express = require('express');
const router = express.Router();
const { all } = require('../database/db');

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const todaySales = await all(`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_sales
      FROM retail_orders 
      WHERE order_date = ?
    `, [today]);
    
    const todayRoasting = await all(`
      SELECT 
        COUNT(*) as roast_count,
        COALESCE(SUM(product_output), 0) as total_output,
        COALESCE(SUM(loss_weight), 0) as total_loss
      FROM roasting_records 
      WHERE roast_date = ?
    `, [today]);
    
    const lowStockMaterials = await all(`
      SELECT COUNT(*) as count
      FROM raw_materials 
      WHERE current_stock < safety_stock
    `);
    
    const activeEmployees = await all(`
      SELECT 
        SUM(CASE WHEN role = 'operator' THEN 1 ELSE 0 END) as operator_count,
        SUM(CASE WHEN role = 'salesperson' THEN 1 ELSE 0 END) as salesperson_count
      FROM employees 
      WHERE status = 'active'
    `);
    
    const salesTrend = await all(`
      SELECT 
        order_date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales
      FROM retail_orders
      WHERE order_date >= DATE('now', '-7 days')
      GROUP BY order_date
      ORDER BY order_date ASC
    `);
    
    const productSales = await all(`
      SELECT 
        fp.name as product_name,
        SUM(roi.quantity) as total_quantity,
        SUM(roi.subtotal) as total_sales
      FROM retail_order_items roi
      LEFT JOIN finished_products fp ON roi.product_id = fp.id
      LEFT JOIN retail_orders ro ON roi.order_id = ro.id
      WHERE ro.order_date >= DATE('now', '-30 days')
      GROUP BY roi.product_id
      ORDER BY total_sales DESC
      LIMIT 10
    `);
    
    res.json({
      today: {
        order_count: todaySales[0].order_count,
        total_sales: todaySales[0].total_sales,
        roast_count: todayRoasting[0].roast_count,
        total_output: todayRoasting[0].total_output,
        total_loss: todayRoasting[0].total_loss
      },
      low_stock_count: lowStockMaterials[0].count,
      employees: activeEmployees[0],
      sales_trend: salesTrend,
      product_sales: productSales
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/sales-trend', async (req, res) => {
  try {
    const { start_date, end_date, group_by } = req.query;
    
    let dateFormat = '%Y-%m-%d';
    if (group_by === 'month') {
      dateFormat = '%Y-%m';
    } else if (group_by === 'year') {
      dateFormat = '%Y';
    }
    
    let sql = `
      SELECT 
        strftime(?, order_date) as period,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales,
        SUM(CASE WHEN order_type = 'retail' THEN total_amount ELSE 0 END) as retail_sales,
        SUM(CASE WHEN order_type = 'wholesale' THEN total_amount ELSE 0 END) as wholesale_sales
      FROM retail_orders
      WHERE 1=1
    `;
    
    const params = [dateFormat];
    if (start_date) {
      sql += ' AND order_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND order_date <= ?';
      params.push(end_date);
    }
    
    sql += ' GROUP BY period ORDER BY period ASC';
    
    const trend = await all(sql, params);
    res.json(trend);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/product-sales', async (req, res) => {
  try {
    const { start_date, end_date, top } = req.query;
    const limit = top || 20;
    
    let sql = `
      SELECT 
        fp.id,
        fp.name as product_name,
        fp.category,
        SUM(roi.quantity) as total_quantity,
        SUM(roi.subtotal) as total_sales,
        COUNT(DISTINCT roi.order_id) as order_count
      FROM retail_order_items roi
      LEFT JOIN finished_products fp ON roi.product_id = fp.id
      LEFT JOIN retail_orders ro ON roi.order_id = ro.id
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
    
    sql += ' GROUP BY fp.id ORDER BY total_sales DESC LIMIT ?';
    params.push(limit);
    
    const sales = await all(sql, params);
    res.json(sales);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/loss-statistics', async (req, res) => {
  try {
    const { start_date, end_date, group_by } = req.query;
    
    let groupField = 'rm.id';
    let selectField = 'rm.name as name, rm.category';
    
    if (group_by === 'product') {
      groupField = 'fp.id';
      selectField = 'fp.name as name, fp.category';
    }
    
    let sql = `
      SELECT 
        ${selectField},
        COUNT(*) as roast_count,
        SUM(rr.material_used) as total_material_used,
        SUM(rr.product_output) as total_product_output,
        SUM(rr.loss_weight) as total_loss,
        AVG(rr.loss_rate) as avg_loss_rate
      FROM roasting_records rr
      LEFT JOIN raw_materials rm ON rr.material_id = rm.id
      LEFT JOIN finished_products fp ON rr.product_id = fp.id
      WHERE 1=1
    `;
    
    const params = [];
    if (start_date) {
      sql += ' AND rr.roast_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND rr.roast_date <= ?';
      params.push(end_date);
    }
    
    sql += ` GROUP BY ${groupField} ORDER BY total_loss DESC`;
    
    const stats = await all(sql, params);
    res.json(stats);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/profit-analysis', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let sql = `
      SELECT 
        fp.name as product_name,
        fp.category,
        SUM(roi.quantity) as total_quantity,
        SUM(roi.subtotal) as total_revenue,
        SUM(roi.quantity * rm.avg_cost) as total_cost,
        SUM(roi.subtotal) - SUM(roi.quantity * rm.avg_cost) as total_profit,
        CASE WHEN SUM(roi.subtotal) > 0 
             THEN ROUND((SUM(roi.subtotal) - SUM(roi.quantity * rm.avg_cost)) / SUM(roi.subtotal) * 100, 2)
             ELSE 0 END as profit_margin
      FROM retail_order_items roi
      LEFT JOIN finished_products fp ON roi.product_id = fp.id
      LEFT JOIN raw_materials rm ON fp.raw_material_id = rm.id
      LEFT JOIN retail_orders ro ON roi.order_id = ro.id
      WHERE fp.is_gift_box = 0 AND fp.raw_material_id IS NOT NULL
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
    
    sql += ' GROUP BY fp.id ORDER BY total_profit DESC';
    
    const profit = await all(sql, params);
    res.json(profit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/slow-moving-products', async (req, res) => {
  try {
    const { days, min_stock } = req.query;
    const checkDays = days || 30;
    const minStock = min_stock || 10;
    
    const slowProducts = await all(`
      SELECT 
        fp.id,
        fp.name as product_name,
        fp.category,
        fp.current_stock,
        fp.retail_price,
        COALESCE(sales.total_quantity, 0) as sales_quantity,
        COALESCE(sales.total_sales, 0) as sales_amount
      FROM finished_products fp
      LEFT JOIN (
        SELECT 
          roi.product_id,
          SUM(roi.quantity) as total_quantity,
          SUM(roi.subtotal) as total_sales
        FROM retail_order_items roi
        LEFT JOIN retail_orders ro ON roi.order_id = ro.id
        WHERE ro.order_date >= DATE('now', ? || ' days')
        GROUP BY roi.product_id
      ) sales ON fp.id = sales.product_id
      WHERE fp.current_stock >= ?
        AND (COALESCE(sales.total_quantity, 0) = 0 OR sales.total_quantity < fp.current_stock * 0.1)
      ORDER BY sales_quantity ASC, current_stock DESC
    `, [`-${checkDays}`, minStock]);
    
    res.json(slowProducts);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/employee-performance', async (req, res) => {
  try {
    const { start_date, end_date, role } = req.query;
    
    if (role === 'operator' || !role) {
      const operators = await all(`
        SELECT 
          e.id,
          e.name,
          COUNT(*) as roast_count,
          SUM(rr.product_output) as total_output,
          SUM(rr.loss_weight) as total_loss,
          AVG(rr.loss_rate) as avg_loss_rate
        FROM roasting_records rr
        LEFT JOIN employees e ON rr.operator_id = e.id
        WHERE 1=1
          ${start_date ? 'AND rr.roast_date >= ?' : ''}
          ${end_date ? 'AND rr.roast_date <= ?' : ''}
        GROUP BY e.id
        ORDER BY total_output DESC
      `, [start_date, end_date].filter(Boolean));
      
      if (role === 'operator') {
        return res.json(operators);
      }
    }
    
    if (role === 'salesperson' || !role) {
      const salespersons = await all(`
        SELECT 
          e.id,
          e.name,
          COUNT(*) as order_count,
          SUM(ro.total_amount) as total_sales,
          SUM(CASE WHEN ro.order_type = 'retail' THEN ro.total_amount ELSE 0 END) as retail_sales,
          SUM(CASE WHEN ro.order_type = 'wholesale' THEN ro.total_amount ELSE 0 END) as wholesale_sales
        FROM retail_orders ro
        LEFT JOIN employees e ON ro.salesperson_id = e.id
        WHERE 1=1
          ${start_date ? 'AND ro.order_date >= ?' : ''}
          ${end_date ? 'AND ro.order_date <= ?' : ''}
        GROUP BY e.id
        ORDER BY total_sales DESC
      `, [start_date, end_date].filter(Boolean));
      
      if (role === 'salesperson') {
        return res.json(salespersons);
      }
    }
    
    res.json({ message: '请指定 role 参数' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/member-level-sales', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let sql = `
      SELECT 
        member_level,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales
      FROM retail_orders
      WHERE order_type = 'retail'
    `;
    
    const params = [];
    if (start_date) {
      sql += ' AND order_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND order_date <= ?';
      params.push(end_date);
    }
    
    sql += ' GROUP BY member_level ORDER BY total_sales DESC';
    
    const results = await all(sql, params);
    
    const levelNames = {
      normal: '普通会员',
      silver: '银卡会员',
      gold: '金卡会员'
    };
    
    const totalSales = results.reduce((sum, r) => sum + r.total_sales, 0);
    
    const data = results.map(r => ({
      member_level: r.member_level,
      level_name: levelNames[r.member_level] || r.member_level,
      order_count: r.order_count,
      total_sales: r.total_sales,
      percentage: totalSales > 0 ? Math.round(r.total_sales / totalSales * 10000) / 100 : 0
    }));
    
    res.json({
      total_sales: totalSales,
      data: data
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
