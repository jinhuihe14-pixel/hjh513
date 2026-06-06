import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Tag } from 'antd';
import {
  FireOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { statisticsAPI, materialsAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({});
  const [lowStockMaterials, setLowStockMaterials] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, lowStockRes] = await Promise.all([
        statisticsAPI.getDashboard(),
        materialsAPI.getAll({ low_stock: 'true' })
      ]);
      setDashboardData(dashboardRes.data);
      setLowStockMaterials(lowStockRes.data);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const lowStockColumns = [
    { title: '原料名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '当前库存', dataIndex: 'current_stock', key: 'current_stock', render: (v, r) => `${v} ${r.unit}` },
    { title: '安全库存', dataIndex: 'safety_stock', key: 'safety_stock', render: (v, r) => `${v} ${r.unit}` },
    { title: '状态', key: 'status', render: () => <Tag color="red">库存不足</Tag> }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        工作台 - {dayjs().format('YYYY年MM月DD日')}
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="今日炒制产量"
              value={dashboardData.today_roasting_output || 0}
              suffix="斤"
              prefix={<FireOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="今日销售额"
              value={dashboardData.today_sales || 0}
              precision={2}
              prefix="¥"
              suffix=""
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="今日订单数"
              value={dashboardData.today_order_count || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="库存预警"
              value={dashboardData.low_stock_count || 0}
              suffix="种"
              prefix={<WarningOutlined style={{ color: '#cf1322' }} />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="库存预警 - 原料不足" className="table-container">
            {lowStockMaterials.length > 0 ? (
              <Table
                columns={lowStockColumns}
                dataSource={lowStockMaterials}
                rowKey="id"
                pagination={false}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <GiftOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>所有原料库存充足</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
