import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Row, Col, DatePicker, Select, Tabs, Table, Tag, Space
} from 'antd';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { statisticsAPI, roastingAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const COLORS = ['#fa8c16', '#52c41a', '#1890ff', '#722ed1', '#eb2f96', '#13c2c2'];

function Statistics() {
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [productProfit, setProductProfit] = useState([]);
  const [unsalableProducts, setUnsalableProducts] = useState([]);
  const [lossStatistics, setLossStatistics] = useState([]);
  const [categorySales, setCategorySales] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const startDate = dateRange[0].format('YYYY-MM-DD');
    const endDate = dateRange[1].format('YYYY-MM-DD');

    try {
      const [trendRes, profitRes, unsalableRes, lossRes, categoryRes] = await Promise.all([
        statisticsAPI.getSalesTrend({ start_date: startDate, end_date: endDate }),
        statisticsAPI.getProductProfit({ start_date: startDate, end_date: endDate }),
        statisticsAPI.getUnsalableProducts({ days: 30 }),
        roastingAPI.getLossStatistics({ start_date: startDate, end_date: endDate, group_by: 'material' }),
        statisticsAPI.getCategorySales({ start_date: startDate, end_date: endDate })
      ]);

      setSalesTrend(trendRes.data);
      setProductProfit(profitRes.data);
      setUnsalableProducts(unsalableRes.data);
      setLossStatistics(lossRes.data);
      setCategorySales(categoryRes.data);
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  const profitColumns = [
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '销售数量', dataIndex: 'total_quantity', key: 'total_quantity' },
    { title: '销售收入', dataIndex: 'total_revenue', key: 'total_revenue',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '利润', dataIndex: 'profit', key: 'profit',
      render: (v) => v !== null ? `¥${v.toFixed(2)}` : '-'
    },
    { title: '利润率', dataIndex: 'profit_margin', key: 'profit_margin',
      render: (v) => v !== null ? <Tag color={parseFloat(v) > 30 ? 'green' : parseFloat(v) > 15 ? 'orange' : 'red'}>{v}%</Tag> : '-'
    }
  ];

  const unsalableColumns = [
    { title: '商品名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '当前库存', dataIndex: 'current_stock', key: 'current_stock',
      render: (v, r) => `${v} ${r.unit}`
    },
    { title: '零售价', dataIndex: 'retail_price', key: 'retail_price',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '近30天销量', dataIndex: 'sales_quantity', key: 'sales_quantity',
      render: (v) => v === 0 ? <Tag color="red">0</Tag> : v
    },
    { title: '近30天销售额', dataIndex: 'sales_amount', key: 'sales_amount',
      render: (v) => `¥${v.toFixed(2)}`
    }
  ];

  const lossColumns = [
    { title: '原料名称', dataIndex: 'name', key: 'name' },
    { title: '炒制次数', dataIndex: 'roast_count', key: 'roast_count' },
    { title: '总用料(斤)', dataIndex: 'total_material_used', key: 'total_material_used' },
    { title: '总产量(斤)', dataIndex: 'total_product_output', key: 'total_product_output' },
    { title: '总损耗(斤)', dataIndex: 'total_loss', key: 'total_loss',
      render: (v) => <span style={{ color: '#cf1322' }}>{v.toFixed(2)}</span>
    },
    { title: '平均损耗率', dataIndex: 'avg_loss_rate', key: 'avg_loss_rate',
      render: (v) => <Tag color={v > 10 ? 'red' : v > 5 ? 'orange' : 'green'}>{v.toFixed(1)}%</Tag>
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <Title level={3}>统计分析</Title>
        <Space>
          <RangePicker 
            value={dateRange}
            onChange={setDateRange}
          />
          <Select 
            style={{ width: 150 }} 
            defaultValue="30"
            onChange={(v) => setDateRange([dayjs().subtract(v, 'day'), dayjs()])}
          >
            <Select.Option value="7">最近7天</Select.Option>
            <Select.Option value="30">最近30天</Select.Option>
            <Select.Option value="90">最近90天</Select.Option>
          </Select>
        </Space>
      </div>

      <Tabs defaultActiveKey="1">
        <TabPane tab="销售趋势" key="1">
          <Card>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `¥${value}`} />
                <Legend />
                <Line type="monotone" dataKey="total_sales" stroke="#fa8c16" name="总销售额" strokeWidth={2} />
                <Line type="monotone" dataKey="retail_sales" stroke="#1890ff" name="零售" />
                <Line type="monotone" dataKey="wholesale_sales" stroke="#52c41a" name="批发" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab="分类销售" key="2">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="分类销售额占比">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={categorySales}
                      dataKey="total_revenue"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {categorySales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `¥${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="分类销量对比">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={categorySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_quantity" fill="#1890ff" name="销量(斤)" />
                    <Bar dataKey="order_count" fill="#52c41a" name="订单数" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="商品利润" key="3">
          <div className="table-container">
            <Table
              columns={profitColumns}
              dataSource={productProfit}
              rowKey="product_id"
              pagination={{ pageSize: 10 }}
            />
          </div>
        </TabPane>

        <TabPane tab="损耗分析" key="4">
          <Row gutter={16}>
            <Col span={24}>
              <Card title="原料损耗统计" style={{ marginBottom: 16 }}>
                <Table
                  columns={lossColumns}
                  dataSource={lossStatistics}
                  rowKey="name"
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="滞销商品" key="5">
          <Card>
            <Table
              columns={unsalableColumns}
              dataSource={unsalableProducts}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default Statistics;
