import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Space, DatePicker, Statistic, Row, Col, Card, Tag } from 'antd';
import { PlusOutlined, FireOutlined } from '@ant-design/icons';
import { roastingAPI, materialsAPI, productsAPI, employeesAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

function Roasting() {
  const [records, setRecords] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState({ records: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recordsRes, materialsRes, productsRes, employeesRes, summaryRes] = await Promise.all([
        roastingAPI.getAll(),
        materialsAPI.getAll(),
        productsAPI.getAll({ is_gift_box: false }),
        employeesAPI.getAll({ role: 'operator' }),
        roastingAPI.getDailySummary({ date: dayjs().format('YYYY-MM-DD') })
      ]);
      setRecords(recordsRes.data);
      setMaterials(materialsRes.data);
      setProducts(productsRes.data);
      setOperators(employeesRes.data.filter(e => e.status === 'active'));
      setDailySummary(summaryRes.data);
    } catch (error) {
      message.error('加载失败');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({ roast_date: dayjs() });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const data = {
        ...values,
        roast_date: values.roast_date.format('YYYY-MM-DD')
      };
      
      await roastingAPI.create(data);
      message.success('炒制记录添加成功');
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '炒制日期', dataIndex: 'roast_date', key: 'roast_date' },
    { title: '操作工', dataIndex: 'operator_name', key: 'operator_name' },
    { title: '原料', dataIndex: 'material_name', key: 'material_name' },
    { title: '用料(斤)', dataIndex: 'material_used', key: 'material_used' },
    { title: '成品', dataIndex: 'product_name', key: 'product_name' },
    { title: '产出(斤)', dataIndex: 'product_output', key: 'product_output' },
    { title: '损耗(斤)', dataIndex: 'loss_weight', key: 'loss_weight',
      render: (v) => <span style={{ color: '#cf1322' }}>{v}</span>
    },
    { title: '损耗率', dataIndex: 'loss_rate', key: 'loss_rate',
      render: (v) => <Tag color={v > 10 ? 'red' : v > 5 ? 'orange' : 'green'}>{v.toFixed(1)}%</Tag>
    },
    { title: '备注', dataIndex: 'remark', key: 'remark' }
  ];

  const totalOutput = dailySummary.records.reduce((sum, r) => sum + r.total_output, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>车间炒制</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增炒制记录
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="今日炒制锅数"
              value={dailySummary.records.reduce((sum, r) => sum + r.roast_times, 0)}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="今日总产量"
              value={totalOutput}
              suffix="斤"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="操作工人数"
              value={dailySummary.records.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title="新增炒制记录"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="roast_date" label="炒制日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="operator_id" label="操作工" rules={[{ required: true }]}>
            <Select placeholder="请选择操作工">
              {operators.map(o => (
                <Select.Option key={o.id} value={o.id}>{o.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="material_id" label="原料" rules={[{ required: true }]}>
            <Select placeholder="请选择原料">
              {materials.map(m => (
                <Select.Option key={m.id} value={m.id}>
                  {m.name} (库存: {m.current_stock}{m.unit})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="material_used" label="原料用量(斤)" rules={[{ required: true }]}>
            <Input type="number" placeholder="请输入原料用量" step="0.01" />
          </Form.Item>
          <Form.Item name="product_id" label="成品" rules={[{ required: true }]}>
            <Select placeholder="请选择成品">
              {products.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="product_output" label="成品产出(斤)" rules={[{ required: true }]}>
            <Input type="number" placeholder="请输入成品产出重量" step="0.01" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Roasting;
