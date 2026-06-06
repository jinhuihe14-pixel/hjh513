const express = require('express');
const router = express.Router();
const { all, run, get } = require('../database/db');

router.get('/config', async (req, res) => {
  try {
    const config = await all('SELECT * FROM salary_config ORDER BY created_at DESC');
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/config', async (req, res) => {
  const { role, config_type, config_value, description } = req.body;
  
  try {
    const result = await run(
      'INSERT INTO salary_config (role, config_type, config_value, description) VALUES (?, ?, ?, ?)',
      [role, config_type, config_value, description]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/config/:id', async (req, res) => {
  const { id } = req.params;
  const { config_value, description, is_active } = req.body;
  
  try {
    await run(
      'UPDATE salary_config SET config_value = ?, description = ?, is_active = ? WHERE id = ?',
      [config_value, description, is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/rewards', async (req, res) => {
  try {
    const { start_date, end_date, employee_id } = req.query;
    let sql = `
      SELECT sr.*, e.name as employee_name
      FROM salary_rewards sr
      LEFT JOIN employees e ON sr.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    
    if (start_date) {
      sql += ' AND sr.reward_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND sr.reward_date <= ?';
      params.push(end_date);
    }
    if (employee_id) {
      sql += ' AND sr.employee_id = ?';
      params.push(employee_id);
    }
    
    sql += ' ORDER BY sr.reward_date DESC, sr.created_at DESC';
    const rewards = await all(sql, params);
    res.json(rewards);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/rewards', async (req, res) => {
  const { employee_id, reward_type, amount, reward_date, reason } = req.body;
  
  try {
    const result = await run(
      'INSERT INTO salary_rewards (employee_id, reward_type, amount, reward_date, reason) VALUES (?, ?, ?, ?, ?)',
      [employee_id, reward_type, amount, reward_date, reason]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/daily-summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT 
        sds.*,
        e.name as employee_name,
        e.role
      FROM salary_daily_summary sds
      LEFT JOIN employees e ON sds.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    
    if (start_date) {
      sql += ' AND sds.summary_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND sds.summary_date <= ?';
      params.push(end_date);
    }
    
    sql += ' ORDER BY sds.summary_date DESC, sds.created_at DESC';
    const summaries = await all(sql, params);
    res.json(summaries);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/generate-daily-summary', async (req, res) => {
  const { date } = req.body;
  const summaryDate = date || new Date().toISOString().split('T')[0];
  
  try {
    await run('DELETE FROM salary_daily_summary WHERE summary_date = ?', [summaryDate]);
    
    const config = await all('SELECT * FROM salary_config WHERE is_active = 1');
    const pieceRateConfig = config.find(c => c.role === 'operator' && c.config_type === 'piece_rate');
    const retailCommissionConfig = config.find(c => c.role === 'salesperson' && c.config_type === 'retail_commission');
    const wholesaleCommissionConfig = config.find(c => c.role === 'salesperson' && c.config_type === 'wholesale_commission');
    
    const pieceRate = pieceRateConfig ? parseFloat(pieceRateConfig.config_value) : 0.5;
    const retailCommissionRate = retailCommissionConfig ? parseFloat(retailCommissionConfig.config_value) : 0.02;
    const wholesaleCommissionRate = wholesaleCommissionConfig ? parseFloat(wholesaleCommissionConfig.config_value) : 0.01;
    
    const operators = await all(`
      SELECT 
        operator_id,
        SUM(product_output) as total_output
      FROM roasting_records
      WHERE roast_date = ?
      GROUP BY operator_id
    `, [summaryDate]);
    
    for (const op of operators) {
      const pieceworkPay = op.total_output * pieceRate;
      await run(
        'INSERT INTO salary_daily_summary (summary_date, employee_id, role, total_output, piecework_pay) VALUES (?, ?, ?, ?, ?)',
        [summaryDate, op.operator_id, 'operator', op.total_output, pieceworkPay]
      );
    }
    
    const salespersons = await all(`
      SELECT 
        salesperson_id,
        SUM(CASE WHEN order_type = 'retail' THEN total_amount ELSE 0 END) as retail_sales,
        SUM(CASE WHEN order_type = 'wholesale' THEN total_amount ELSE 0 END) as wholesale_sales
      FROM retail_orders
      WHERE order_date = ?
      GROUP BY salesperson_id
    `, [summaryDate]);
    
    for (const sp of salespersons) {
      const retailCommission = sp.retail_sales * retailCommissionRate;
      const wholesaleCommission = sp.wholesale_sales * wholesaleCommissionRate;
      
      await run(
        `INSERT INTO salary_daily_summary 
         (summary_date, employee_id, role, retail_sales, wholesale_sales, retail_commission, wholesale_commission, total_commission)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [summaryDate, sp.salesperson_id, 'salesperson', sp.retail_sales, sp.wholesale_sales, 
         retailCommission, wholesaleCommission, retailCommission + wholesaleCommission]
      );
    }
    
    res.json({ success: true, operator_count: operators.length, salesperson_count: salespersons.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/monthly-settlement', async (req, res) => {
  try {
    const { month, status } = req.query;
    let sql = `
      SELECT 
        ms.*,
        e.name as employee_name,
        e.role
      FROM monthly_settlements ms
      LEFT JOIN employees e ON ms.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    
    if (month) {
      sql += ' AND ms.settlement_month = ?';
      params.push(month);
    }
    if (status) {
      sql += ' AND ms.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY ms.settlement_month DESC, ms.created_at DESC';
    const settlements = await all(sql, params);
    res.json(settlements);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/generate-monthly-settlement', async (req, res) => {
  const { month } = req.body;
  
  try {
    const employees = await all('SELECT * FROM employees WHERE status = "active"');
    
    for (const emp of employees) {
      const dailySummary = await all(`
        SELECT * FROM salary_daily_summary 
        WHERE employee_id = ? AND summary_date LIKE ?
      `, [emp.id, `${month}%`]);
      
      const rewards = await all(`
        SELECT 
          SUM(CASE WHEN reward_type = 'bonus' THEN amount ELSE 0 END) as total_bonus,
          SUM(CASE WHEN reward_type = 'penalty' THEN amount ELSE 0 END) as total_penalty
        FROM salary_rewards 
        WHERE employee_id = ? AND reward_date LIKE ?
      `, [emp.id, `${month}%`]);
      
      let baseSalary = 0;
      let pieceworkPay = 0;
      let totalCommission = 0;
      let totalOutput = 0;
      let totalSales = 0;
      
      dailySummary.forEach(ds => {
        pieceworkPay += ds.piecework_pay || 0;
        totalCommission += ds.total_commission || 0;
        totalOutput += ds.total_output || 0;
        totalSales += (ds.retail_sales || 0) + (ds.wholesale_sales || 0);
      });
      
      const totalBonus = rewards[0]?.total_bonus || 0;
      const totalPenalty = rewards[0]?.total_penalty || 0;
      const grossSalary = baseSalary + pieceworkPay + totalCommission + totalBonus - totalPenalty;
      
      const existing = await get('SELECT id FROM monthly_settlements WHERE employee_id = ? AND settlement_month = ?', [emp.id, month]);
      
      if (existing) {
        await run(
          `UPDATE monthly_settlements SET 
           base_salary = ?, piecework_pay = ?, total_commission = ?, 
           total_bonus = ?, total_penalty = ?, gross_salary = ?,
           total_output = ?, total_sales = ?
           WHERE id = ?`,
          [baseSalary, pieceworkPay, totalCommission, totalBonus, totalPenalty, grossSalary, totalOutput, totalSales, existing.id]
        );
      } else {
        await run(
          `INSERT INTO monthly_settlements 
           (settlement_month, employee_id, role, base_salary, piecework_pay, total_commission, 
            total_bonus, total_penalty, gross_salary, final_salary, total_output, total_sales)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [month, emp.id, emp.role, baseSalary, pieceworkPay, totalCommission, 
           totalBonus, totalPenalty, grossSalary, grossSalary, totalOutput, totalSales]
        );
      }
    }
    
    res.json({ success: true, employee_count: employees.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/monthly-settlement/:id', async (req, res) => {
  const { id } = req.params;
  const { manual_adjustment, adjust_reason, final_salary } = req.body;
  
  try {
    await run(
      'UPDATE monthly_settlements SET manual_adjustment = ?, adjust_reason = ?, final_salary = ? WHERE id = ?',
      [manual_adjustment || 0, adjust_reason || '', final_salary, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/monthly-settlement/:id/lock', async (req, res) => {
  const { id } = req.params;
  
  try {
    await run('UPDATE monthly_settlements SET status = ? WHERE id = ?', ['locked', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
