const express = require('express');
const cors = require('cors');
const initializeDatabase = require('./database/init');

async function startServer() {
  await initializeDatabase();

  const employeesRouter = require('./routes/employees');
  const materialsRouter = require('./routes/materials');
  const productsRouter = require('./routes/products');
  const roastingRouter = require('./routes/roasting');
  const retailRouter = require('./routes/retail');
  const salaryRouter = require('./routes/salary');
  const statisticsRouter = require('./routes/statistics');

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json());

  app.use('/api/employees', employeesRouter);
  app.use('/api/materials', materialsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/roasting', roastingRouter);
  app.use('/api/retail', retailRouter);
  app.use('/api/salary', salaryRouter);
  app.use('/api/statistics', statisticsRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '干果门店管理系统API运行正常' });
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || '服务器内部错误' });
  });

  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║    🍿 干果门店管理系统 - 后端服务                          ║
  ║                                                           ║
  ║    服务地址: http://localhost:${PORT}                        ║
  ║    健康检查: http://localhost:${PORT}/api/health             ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
  });
}

startServer().catch(err => {
  console.error('启动服务器失败:', err);
});
