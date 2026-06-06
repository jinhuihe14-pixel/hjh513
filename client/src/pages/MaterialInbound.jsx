import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Space, DatePicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { materialsAPI, employeesAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

function MaterialInbound() {
  const [inboundRecords, setInboundRecords] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inboundRes, materialsRes, employeesRes] = await Promise.all([
        materialsAPI.getInbound(),
        materialsAPI.getAll(),
        employeesAPI.getAll()
      ]);
      setInboundRecords(inboundRes.data);
      setMaterials(materialsRes.data);
      setEmployees(employeesRes.data.filter(e => e.status === 'active'));
    } catch (error) {
      message.error('加载失败');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({ inbound_date: dayjs() });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const data = {
        ...values,
        inbound_date: values.inbound_date.format('YYYY-MM-DD')
      };
      
      await materialsAPI.createInbound(data);
      message.success('入库成功');
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '入库日期', dataIndex: 'inbound_date', key: 'inbound_date' },
    { title: '原料名称', dataIndex: 'material_name', key: 'material_name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', 
      render: (v, r) => `${v} ${r.unit}` 
    },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '总价', dataIndex: 'total_price', key: 'total_price',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '操作员', dataIndex: 'operator_name', key: 'operator_name' },
    { title: '备注', dataIndex: 'remark', key: 'remark' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>原料入库</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建入库
        </Button>
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={inboundRecords}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title="原料入库"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="inbound_date" label="入库日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="material_id" label="原料" rules={[{ required: true }]}>
            <Select placeholder="请选择原料">
              {materials.map(m => (
                <Select.Option key={m.id} value={m.id}>
                  {m.name} ({m.category}) - 库存: {m.current_stock}{m.unit}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label="数量(斤)" rules={[{ required: true }]}>
            <Input type="number" placeholder="请输入数量" step="0.01" />
          </Form.Item>
          <Form.Item name="unit_price" label="单价(元)" rules={[{ required: true }]}>
            <Input type="number" placeholder="请输入单价" step="0.01" />
          </Form.Item>
          <Form.Item name="supplier" label="供应商">
            <Input placeholder="请输入供应商" />
          </Form.Item>
          <Form.Item name="operator_id" label="操作员">
            <Select placeholder="请选择操作员">
              {employees.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default MaterialInbound;
