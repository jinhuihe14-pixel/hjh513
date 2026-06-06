const express = require('express');
const router = express.Router();
const { all, run, get } = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const { low_stock } = req.query;
    let sql = 'SELECT * FROM raw_materials WHERE 1=1';
    const params = [];
    
    if (low_stock === 'true') {
      sql += ' AND current_stock < safety_stock';
    }
    
    sql += ' ORDER BY created_at DESC';
    const materials = await all(sql, params);
    res.json(materials);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, category, unit, safety_stock } = req.body;
  
  try {
    const result = await run(
      'INSERT INTO raw_materials (name, category, unit, safety_stock) VALUES (?, ?, ?, ?)',
      [name, category, unit || '斤', safety_stock || 50]
    );
    res.json({ id: result.lastID, name, category, unit: unit || '斤', safety_stock: safety_stock || 50, current_stock: 0 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, unit, safety_stock } = req.body;
  
  try {
    await run(
      'UPDATE raw_materials SET name = ?, category = ?, unit = ?, safety_stock = ? WHERE id = ?',
      [name, category, unit, safety_stock, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/inbound', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT rmi.*, rm.name as material_name, rm.category, rm.unit, e.name as operator_name
      FROM raw_material_inbound rmi
      LEFT JOIN raw_materials rm ON rmi.material_id = rm.id
      LEFT JOIN employees e ON rmi.operator_id = e.id
      WHERE 1=1
    `;
    const params = [];
    
    if (start_date) {
      sql += ' AND rmi.inbound_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND rmi.inbound_date <= ?';
      params.push(end_date);
    }
    
    sql += ' ORDER BY rmi.inbound_date DESC, rmi.created_at DESC';
    const records = await all(sql, params);
    res.json(records);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/inbound', async (req, res) => {
  const { material_id, quantity, unit_price, supplier, inbound_date, operator_id, remark } = req.body;
  const total_price = quantity * unit_price;
  
  try {
    const material = await get('SELECT current_stock, avg_cost FROM raw_materials WHERE id = ?', [material_id]);
    
    await run(
      `INSERT INTO raw_material_inbound 
       (material_id, quantity, unit_price, total_price, supplier, inbound_date, operator_id, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [material_id, quantity, unit_price, total_price, supplier, inbound_date, operator_id, remark]
    );
    
    const newStock = material.current_stock + quantity;
    const newAvgCost = ((material.current_stock * material.avg_cost) + total_price) / newStock;
    
    await run(
      'UPDATE raw_materials SET current_stock = ?, avg_cost = ? WHERE id = ?',
      [newStock, newAvgCost, material_id]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/purchase-suggestions', async (req, res) => {
  try {
    const suggestions = await all(`
      SELECT ps.*, rm.name as material_name, rm.category, rm.unit, rm.avg_cost
      FROM purchase_suggestions ps
      LEFT JOIN raw_materials rm ON ps.material_id = rm.id
      WHERE ps.is_processed = 0
      ORDER BY ps.generated_date DESC
    `);
    res.json(suggestions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/generate-purchase-suggestions', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    await run('UPDATE purchase_suggestions SET is_processed = 1 WHERE is_processed = 0');
    
    const lowStockMaterials = await all(`
      SELECT id, current_stock, safety_stock, name
      FROM raw_materials 
      WHERE current_stock < safety_stock
    `);
    
    for (const m of lowStockMaterials) {
      const suggested = Math.max(m.safety_stock - m.current_stock, 20);
      await run(
        'INSERT INTO purchase_suggestions (material_id, current_stock, safety_stock, suggested_quantity, generated_date) VALUES (?, ?, ?, ?, ?)',
        [m.id, m.current_stock, m.safety_stock, suggested, today]
      );
    }
    
    res.json({ success: true, generated_count: lowStockMaterials.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
