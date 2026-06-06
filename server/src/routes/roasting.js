const express = require('express');
const router = express.Router();
const { all, run, get } = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, operator_id } = req.query;
    let sql = `
      SELECT rr.*, 
             rm.name as material_name, 
             fp.name as product_name,
             e.name as operator_name
      FROM roasting_records rr
      LEFT JOIN raw_materials rm ON rr.material_id = rm.id
      LEFT JOIN finished_products fp ON rr.product_id = fp.id
      LEFT JOIN employees e ON rr.operator_id = e.id
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
    if (operator_id) {
      sql += ' AND rr.operator_id = ?';
      params.push(operator_id);
    }
    
    sql += ' ORDER BY rr.roast_date DESC, rr.created_at DESC';
    const records = await all(sql, params);
    res.json(records);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { roast_date, operator_id, material_id, material_used, product_id, product_output, remark } = req.body;
  
  const loss_weight = material_used - product_output;
  const loss_rate = material_used > 0 ? (loss_weight / material_used) * 100 : 0;
  
  try {
    const material = await get('SELECT current_stock FROM raw_materials WHERE id = ?', [material_id]);
    
    if (material.current_stock < material_used) {
      return res.status(400).json({ error: '原料库存不足' });
    }
    
    await run(
      `INSERT INTO roasting_records 
       (roast_date, operator_id, material_id, material_used, product_id, product_output, loss_weight, loss_rate, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [roast_date, operator_id, material_id, material_used, product_id, product_output, loss_weight, loss_rate, remark]
    );
    
    await run(
      'UPDATE raw_materials SET current_stock = current_stock - ? WHERE id = ?',
      [material_used, material_id]
    );
    
    await run(
      'UPDATE finished_products SET current_stock = current_stock + ? WHERE id = ?',
      [product_output, product_id]
    );
    
    res.json({ success: true, loss_weight, loss_rate });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/loss-statistics', async (req, res) => {
  try {
    const { start_date, end_date, group_by } = req.query;
    
    let groupField = 'material_id';
    let nameField = 'rm.name as name';
    if (group_by === 'product') {
      groupField = 'product_id';
      nameField = 'fp.name as name';
    }
    
    let sql = `
      SELECT 
        ${nameField},
        COUNT(*) as roast_count,
        SUM(material_used) as total_material_used,
        SUM(product_output) as total_product_output,
        SUM(loss_weight) as total_loss,
        AVG(loss_rate) as avg_loss_rate
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

router.get('/daily-summary', async (req, res) => {
  try {
    const { date } = req.query;
    const summaryDate = date || new Date().toISOString().split('T')[0];
    
    const records = await all(`
      SELECT 
        operator_id,
        e.name as operator_name,
        SUM(product_output) as total_output,
        COUNT(*) as roast_times
      FROM roasting_records rr
      LEFT JOIN employees e ON rr.operator_id = e.id
      WHERE rr.roast_date = ?
      GROUP BY operator_id
    `, [summaryDate]);
    
    res.json({ date: summaryDate, records });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
