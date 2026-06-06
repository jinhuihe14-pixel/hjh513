const { initDatabase, exec, run, all } = require('./db');

const initSql = `
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('operator', 'salesperson', 'admin')),
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT '斤',
  current_stock REAL DEFAULT 0,
  avg_cost REAL DEFAULT 0,
  safety_stock REAL DEFAULT 50,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_material_inbound (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  supplier TEXT,
  inbound_date DATE NOT NULL,
  operator_id INTEGER,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES raw_materials(id),
  FOREIGN KEY (operator_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS purchase_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  current_stock REAL NOT NULL,
  safety_stock REAL NOT NULL,
  suggested_quantity REAL NOT NULL,
  generated_date DATE NOT NULL,
  is_processed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES raw_materials(id)
);

CREATE TABLE IF NOT EXISTS finished_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  raw_material_id INTEGER,
  category TEXT,
  unit TEXT DEFAULT '斤',
  current_stock REAL DEFAULT 0,
  retail_price REAL NOT NULL,
  wholesale_price REAL DEFAULT 0,
  is_gift_box INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
);

CREATE TABLE IF NOT EXISTS gift_box_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gift_box_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gift_box_id) REFERENCES finished_products(id),
  FOREIGN KEY (product_id) REFERENCES finished_products(id)
);

CREATE TABLE IF NOT EXISTS roasting_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roast_date DATE NOT NULL,
  operator_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  material_used REAL NOT NULL,
  product_id INTEGER NOT NULL,
  product_output REAL NOT NULL,
  loss_weight REAL NOT NULL,
  loss_rate REAL NOT NULL,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES employees(id),
  FOREIGN KEY (material_id) REFERENCES raw_materials(id),
  FOREIGN KEY (product_id) REFERENCES finished_products(id)
);

CREATE TABLE IF NOT EXISTS retail_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  order_date DATE NOT NULL,
  salesperson_id INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  order_type TEXT DEFAULT 'retail',
  member_level TEXT DEFAULT 'normal',
  customer_name TEXT,
  customer_phone TEXT,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salesperson_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS retail_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES retail_orders(id),
  FOREIGN KEY (product_id) REFERENCES finished_products(id)
);

CREATE TABLE IF NOT EXISTS salary_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  config_type TEXT NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('bonus', 'penalty')),
  amount REAL NOT NULL,
  reward_date DATE NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS salary_daily_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  summary_date DATE NOT NULL,
  employee_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  total_output REAL DEFAULT 0,
  piecework_pay REAL DEFAULT 0,
  retail_sales REAL DEFAULT 0,
  wholesale_sales REAL DEFAULT 0,
  retail_commission REAL DEFAULT 0,
  wholesale_commission REAL DEFAULT 0,
  total_commission REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS monthly_settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  settlement_month TEXT NOT NULL,
  employee_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  base_salary REAL DEFAULT 0,
  piecework_pay REAL DEFAULT 0,
  total_commission REAL DEFAULT 0,
  total_bonus REAL DEFAULT 0,
  total_penalty REAL DEFAULT 0,
  gross_salary REAL NOT NULL,
  manual_adjustment REAL DEFAULT 0,
  adjust_reason TEXT,
  final_salary REAL NOT NULL,
  total_output REAL DEFAULT 0,
  total_sales REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
`;

async function initDefaultData() {
  const employeesCount = await exec('SELECT COUNT(*) as count FROM employees');
  if (employeesCount[0].values[0][0] === 0) {
    await run("INSERT INTO employees (name, phone, role) VALUES (?, ?, ?)", ['张三', '13800138001', 'operator']);
    await run("INSERT INTO employees (name, phone, role) VALUES (?, ?, ?)", ['李四', '13800138002', 'operator']);
    await run("INSERT INTO employees (name, phone, role) VALUES (?, ?, ?)", ['王五', '13800138003', 'salesperson']);
    await run("INSERT INTO employees (name, phone, role) VALUES (?, ?, ?)", ['赵六', '13800138004', 'salesperson']);
    await run("INSERT INTO employees (name, phone, role) VALUES (?, ?, ?)", ['管理员', '13800138000', 'admin']);
  }

  const materialsCount = await exec('SELECT COUNT(*) as count FROM raw_materials');
  if (materialsCount[0].values[0][0] === 0) {
    await run("INSERT INTO raw_materials (name, category, unit, current_stock, avg_cost, safety_stock) VALUES (?, ?, ?, ?, ?, ?)", ['生葵花籽', '瓜子', '斤', 100, 8, 50]);
    await run("INSERT INTO raw_materials (name, category, unit, current_stock, avg_cost, safety_stock) VALUES (?, ?, ?, ?, ?, ?)", ['生花生', '花生', '斤', 80, 6, 40]);
    await run("INSERT INTO raw_materials (name, category, unit, current_stock, avg_cost, safety_stock) VALUES (?, ?, ?, ?, ?, ?)", ['生核桃', '坚果', '斤', 50, 25, 30]);
    await run("INSERT INTO raw_materials (name, category, unit, current_stock, avg_cost, safety_stock) VALUES (?, ?, ?, ?, ?, ?)", ['生巴旦木', '坚果', '斤', 40, 20, 25]);
    await run("INSERT INTO raw_materials (name, category, unit, current_stock, avg_cost, safety_stock) VALUES (?, ?, ?, ?, ?, ?)", ['生南瓜子', '瓜子', '斤', 60, 12, 35]);
  }

  const productsCount = await exec('SELECT COUNT(*) as count FROM finished_products');
  if (productsCount[0].values[0][0] === 0) {
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['原味瓜子', 1, '瓜子', '斤', 50, 15, 12, 0]);
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['焦糖瓜子', 1, '瓜子', '斤', 40, 18, 14.5, 0]);
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['五香花生', 2, '花生', '斤', 35, 12, 9.5, 0]);
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['蒜香花生', 2, '花生', '斤', 30, 12, 9.5, 0]);
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['纸皮核桃', 3, '坚果', '斤', 25, 38, 30, 0]);
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['巴旦木', 4, '坚果', '斤', 20, 35, 28, 0]);
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['南瓜子', 5, '瓜子', '斤', 25, 20, 16, 0]);
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['精品礼盒A', null, '礼盒', '盒', 10, 168, 138, 1]);
    await run("INSERT INTO finished_products (name, raw_material_id, category, unit, current_stock, retail_price, wholesale_price, is_gift_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ['精品礼盒B', null, '礼盒', '盒', 8, 238, 198, 1]);
  }

  const giftBoxItemsCount = await exec('SELECT COUNT(*) as count FROM gift_box_items');
  if (giftBoxItemsCount[0].values[0][0] === 0) {
    await run("INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)", [8, 1, 1]);
    await run("INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)", [8, 3, 1]);
    await run("INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)", [8, 5, 1]);
    await run("INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)", [9, 1, 2]);
    await run("INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)", [9, 3, 2]);
    await run("INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)", [9, 5, 1]);
    await run("INSERT INTO gift_box_items (gift_box_id, product_id, quantity) VALUES (?, ?, ?)", [9, 6, 1]);
  }

  const salaryConfigCount = await exec('SELECT COUNT(*) as count FROM salary_config');
  if (salaryConfigCount[0].values[0][0] === 0) {
    await run("INSERT INTO salary_config (role, config_type, config_value, description) VALUES (?, ?, ?, ?)", ['operator', 'piece_rate', '0.5', '操作工计件单价（元/斤）']);
    await run("INSERT INTO salary_config (role, config_type, config_value, description) VALUES (?, ?, ?, ?)", ['salesperson', 'retail_commission', '0.02', '营业员零售提成比例']);
    await run("INSERT INTO salary_config (role, config_type, config_value, description) VALUES (?, ?, ?, ?)", ['salesperson', 'wholesale_commission', '0.01', '营业员批发提成比例']);
  }
}

async function migrateDatabase() {
  try {
    const columns1 = await exec("PRAGMA table_info(finished_products)");
    const hasWholesalePrice = columns1[0]?.values?.some(col => col[1] === 'wholesale_price');
    if (!hasWholesalePrice) {
      await run("ALTER TABLE finished_products ADD COLUMN wholesale_price REAL DEFAULT 0");
      console.log('已添加 wholesale_price 字段到 finished_products 表');
    }

    const products = await all("SELECT id, retail_price, wholesale_price FROM finished_products");
    for (const p of products) {
      if (!p.wholesale_price || p.wholesale_price === 0) {
        const defaultWholesale = Math.round(p.retail_price * 0.8 * 100) / 100;
        await run("UPDATE finished_products SET wholesale_price = ? WHERE id = ?", [defaultWholesale, p.id]);
      }
    }

    const columns2 = await exec("PRAGMA table_info(retail_orders)");
    const hasMemberLevel = columns2[0]?.values?.some(col => col[1] === 'member_level');
    if (!hasMemberLevel) {
      await run("ALTER TABLE retail_orders ADD COLUMN member_level TEXT DEFAULT 'normal'");
      console.log('已添加 member_level 字段到 retail_orders 表');
    }
  } catch (err) {
    console.error('数据库迁移失败:', err.message);
  }
}

async function initialize() {
  try {
    await initDatabase();
    await exec(initSql);
    await migrateDatabase();
    await initDefaultData();
    console.log('数据库初始化完成！');
  } catch (err) {
    console.error('数据库初始化失败:', err);
  }
}

if (require.main === module) {
  initialize();
}

module.exports = initialize;
