import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  ImportOutlined,
  FireOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  UserOutlined,
  BarChartOutlined,
  DollarOutlined,
  GiftOutlined,
  WarningOutlined
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import MaterialInbound from './pages/MaterialInbound';
import Products from './pages/Products';
import Roasting from './pages/Roasting';
import Retail from './pages/Retail';
import RetailOrders from './pages/RetailOrders';
import Employees from './pages/Employees';
import SalaryConfig from './pages/SalaryConfig';
import MonthlySettlement from './pages/MonthlySettlement';
import Statistics from './pages/Statistics';
import PurchaseSuggestions from './pages/PurchaseSuggestions';

const { Header, Content, Sider } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/materials', icon: <ImportOutlined />, label: '原料管理' },
  { key: '/material-inbound', icon: <ImportOutlined />, label: '原料入库' },
  { key: '/purchase-suggestions', icon: <WarningOutlined />, label: '采购建议' },
  { key: '/products', icon: <GiftOutlined />, label: '成品管理' },
  { key: '/roasting', icon: <FireOutlined />, label: '车间炒制' },
  { key: '/retail', icon: <ShoppingCartOutlined />, label: '前台零售' },
  { key: '/retail-orders', icon: <BarChartOutlined />, label: '销售订单' },
  { key: '/employees', icon: <UserOutlined />, label: '员工管理' },
  { key: '/salary-config', icon: <DollarOutlined />, label: '薪资配置' },
  { key: '/monthly-settlement', icon: <DollarOutlined />, label: '薪资结算' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '统计分析' },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout className="app-layout">
      <Sider theme="dark" width={200}>
        <div className="logo">🍿 干果门店</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/material-inbound" element={<MaterialInbound />} />
            <Route path="/purchase-suggestions" element={<PurchaseSuggestions />} />
            <Route path="/products" element={<Products />} />
            <Route path="/roasting" element={<Roasting />} />
            <Route path="/retail" element={<Retail />} />
            <Route path="/retail-orders" element={<RetailOrders />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/salary-config" element={<SalaryConfig />} />
            <Route path="/monthly-settlement" element={<MonthlySettlement />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
