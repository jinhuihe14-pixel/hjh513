const express = require('express');
const router = express.Router();
const { all, run, get } = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const { is_gift_box, category } = req.query;
    let sql = 'SELECT * FROM finished_products WHERE 1=1';
    const params = [];
    
    if (is_gift_box !== undefined) {
      sql += ' AND is_gift_box = ?';
      params.push(is_gift_box === 'true' ? 1 : 0);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    sql += ' ORDER BY created_at DESC';
    const products = await all(sql, params);
    res.json(products);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, raw_material_id, category, unit, retail_price, is_gift_box, gift_box_items } = req.body;
  
  try {
    const result = await run(
      'INSERT INTO finished_products (name, raw_material_id, category, unit, retail_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?)',
      [name, raw_material_id || null, category, unit || '斤', retail_price, is_gift_box ? 1 : 0]
    );
    
    const productId = result.lastID;
    
    if (is_gift_box && gift_box_items && gift_box_items.length > 0) {
      for (const item of gift_box_items) {
        await run(
          'INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)',
          [productId, item.product_id, item.quantity]
        );
      }
    }
    
    res.json({ id: productId, success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, raw_material_id, category, unit, retail_price, is_gift_box, gift_box_items } = req.body;
  
  try {
    await run(
      'UPDATE finished_products SET name = ?, raw_material_id = ?, category = ?, unit = ?, retail_price = ?, is_gift_box = ? WHERE id = ?',
      [name, raw_material_id || null, category, unit || '斤', retail_price, is_gift_box ? 1 : 0, id]
    );
    
    await run('DELETE FROM gift_box_items WHERE gift_box_id = ?', [id]);
    
    if (is_gift_box && gift_box_items && gift_box_items.length > 0) {
      for (const item of gift_box_items) {
        await run(
          'INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)',
          [id, item.product_id, item.quantity]
        );
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/gift-box-items', async (req, res) => {
  const { id } = req.params;
  
  try {
    const items = await all(`
      SELECT gbi.*, fp.name as product_name
      FROM gift_box_items gbi
      LEFT JOIN finished_products fp ON gbi.product_id = fp.id
      WHERE gbi.gift_box_id = ?
    `, [id]);
    res.json(items);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
