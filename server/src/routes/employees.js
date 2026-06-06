const express = require('express');
const router = express.Router();
const { all, run, get } = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const { role, status } = req.query;
    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params = [];
    
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC';
    const employees = await all(sql, params);
    res.json(employees);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, phone, role } = req.body;
  
  try {
    const result = await run(
      'INSERT INTO employees (name, phone, role) VALUES (?, ?, ?)',
      [name, phone, role]
    );
    res.json({ id: result.lastID, name, phone, role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, status } = req.body;
  
  try {
    await run(
      'UPDATE employees SET name = ?, phone = ?, role = ?, status = ? WHERE id = ?',
      [name, phone, role, status, id]
    );
    res.json({ id, name, phone, role, status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await run('UPDATE employees SET status = ? WHERE id = ?', ['inactive', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
