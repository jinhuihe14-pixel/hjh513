# 🍿 现炒干果门店管理系统

一个完整的全栈门店管理系统，涵盖原料入库、车间炒制、前台零售、老板管理后台四大模块。

## ✨ 功能特性

### 📦 原料管理
- 原料品类维护（瓜子、花生、坚果等）
- 原料入库登记，自动计算平均成本
- 库存预警，自动生成采购建议清单

### 🔥 车间炒制
- 每日炒制记录填报（领料重量、成品产出、损耗）
- 自动核算原料损耗率
- 操作工计件产量统计

### 🛒 前台零售
- 散称零售和礼盒批发开单
- 自动扣减库存
- 绑定当班营业员计算提成
- 销售订单管理

### 💰 薪资管理
- 操作工计件单价配置
- 营业员提成点位配置（零售/批发不同比例）
- 固定奖罚规则配置
- 每日自动汇总生产与销售业绩
- 月末自动核算全员薪资，支持人工微调后锁定

### 📊 统计分析
- 销售趋势图表
- 分类销售占比分析
- 单品利润分析
- 原料损耗率统计
- 滞销品类筛选
- 库存预警提醒

## 🛠️ 技术栈

### 后端
- Node.js + Express
- SQLite (轻量级数据库，无需额外部署)
- better-sqlite3 (高性能SQLite驱动)

### 前端
- React 18 + Vite
- Ant Design 5 (企业级UI组件库)
- React Router (路由管理)
- Recharts (图表库)
- Axios (HTTP请求)

## 🚀 快速开始

### 前置要求
- Node.js >= 16.0.0

### 安装依赖
```bash
# 进入项目根目录
cd hjh513

# 安装根目录依赖
npm install

# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 初始化数据库
```bash
cd server
npm run init-db
```

### 启动开发服务
```bash
# 启动后端服务 (端口: 3001)
cd server
npm run dev

# 新开一个终端，启动前端服务 (端口: 3000)
cd client
npm start
```

或者使用根目录的一键启动命令：
```bash
npm run dev
```

### 访问系统
打开浏览器访问: http://localhost:3000

## 📁 项目结构
```
hjh513/
├── server/                    # 后端服务
│   ├── src/
│   │   ├── database/          # 数据库相关
│   │   │   ├── db.js         # 数据库连接
│   │   │   └── init.js       # 数据库初始化脚本
│   │   ├── routes/            # API路由
│   │   │   ├── employees.js  # 员工管理
│   │   │   ├── materials.js  # 原料管理
│   │   │   ├── products.js   # 成品管理
│   │   │   ├── roasting.js   # 炒制记录
│   │   │   ├── retail.js     # 零售订单
│   │   │   ├── salary.js     # 薪资管理
│   │   │   └── statistics.js # 统计分析
│   │   └── index.js          # 服务入口
│   ├── data/                 # 数据库文件目录 (自动创建)
│   └── package.json
├── client/                    # 前端应用
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Materials.jsx
│   │   │   ├── MaterialInbound.jsx
│   │   │   ├── PurchaseSuggestions.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Roasting.jsx
│   │   │   ├── Retail.jsx
│   │   │   ├── RetailOrders.jsx
│   │   │   ├── Employees.jsx
│   │   │   ├── SalaryConfig.jsx
│   │   │   ├── MonthlySettlement.jsx
│   │   │   └── Statistics.jsx
│   │   ├── services/          # API服务
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── package.json
```

## 📋 使用流程

### 1. 基础数据设置
1. **员工管理**: 添加操作工和营业员
2. **原料管理**: 添加原料品类，设置安全库存
3. **成品管理**: 添加成品（瓜子、花生、坚果等）
4. **薪资配置**: 设置计件单价和提成比例

### 2. 日常操作
1. **原料入库**: 登记原料进货
2. **车间炒制**: 填报每日炒制记录
3. **前台零售**: 顾客消费开单

### 3. 管理功能
1. **查看采购建议**: 库存不足时自动生成采购清单
2. **薪资结算**: 月末一键计算薪资，人工调整后锁定
3. **统计分析**: 查看销售趋势、损耗分析、滞销商品

## 🔧 数据库表说明

| 表名 | 说明 |
|------|------|
| employees | 员工表 |
| raw_materials | 原料表 |
| raw_material_inbound | 原料入库记录表 |
| finished_products | 成品表 |
| roasting_records | 炒制记录表 |
| retail_orders | 零售订单表 |
| retail_order_items | 订单明细表 |
| salary_config | 薪资配置表 |
| bonus_penalty_rules | 奖罚规则表 |
| employee_bonus_penalty | 员工奖罚记录表 |
| monthly_salary_settlement | 月度薪资结算表 |
| purchase_suggestions | 采购建议表 |

## 📝 注意事项

1. 数据库文件位于 `server/data/nut-store.db`，请定期备份
2. 系统默认薪资参数可在"薪资配置"页面调整
3. 礼盒功能支持在成品管理中创建
4. 删除订单会自动恢复库存

## 🤝 技术支持

如有问题，请查看日志或联系技术支持。
