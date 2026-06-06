import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Switch, Space } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { productsAPI, materialsAPI } from '../services/api';

const { Title } = Typography;

function Products() {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isGiftBox, setIsGiftBox] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, materialsRes] = await Promise.all([
        productsAPI.getAll(),
        materialsAPI.getAll()
      ]);
      setProducts(productsRes.data);
      setMaterials(materialsRes.data);
    } catch (error) {
      message.error('加载失败');
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsGiftBox(false);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    setIsGiftBox(record.is_gift_box === 1);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const data = {
        ...values,
        is_gift_box: isGiftBox
      };
      
      if (editingItem) {
        await productsAPI.update(editingItem.id, data);
        message.success('更新成功');
      } else {
        await productsAPI.create(data);
        message.success('添加成功');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '成品名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '类型', key: 'type', render: (_, r) => 
      r.is_gift_box ? '礼盒' : '散称'
    },
    { title: '零售价', dataIndex: 'retail_price', key: 'retail_price',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '当前库存', dataIndex: 'current_stock', key: 'current_stock',
      render: (v, r) => `${v} ${r.unit}`
    },
    { title: '操作', key: 'action', render: (_, record) => (
      <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
        编辑
      </Button>
    )}
  ];

  const nonGiftBoxProducts = products.filter(p => p.is_gift_box === 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>成品管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加成品
        </Button>
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title={editingItem ? '编辑成品' : '添加成品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="成品名称" rules={[{ required: true }]}>
            <Input placeholder="请输入成品名称" />
          </Form.Item>
          <Form.Item label="是否礼盒">
            <Switch 
              checked={isGiftBox} 
              onChange={setIsGiftBox}
              checkedChildren="是"
              unCheckedChildren="否"
            />
          </Form.Item>
          {!isGiftBox && (
            <Form.Item name="raw_material_id" label="对应原料">
              <Select placeholder="请选择原料">
                {materials.map(m => (
                  <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select placeholder="请选择分类">
              <Select.Option value="瓜子">瓜子</Select.Option>
              <Select.Option value="花生">花生</Select.Option>
              <Select.Option value="坚果">坚果</Select.Option>
              <Select.Option value="礼盒">礼盒</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="unit" label="单位" initialValue="斤">
            <Input placeholder="请输入单位" />
          </Form.Item>
          <Form.Item name="retail_price" label="零售价(元)" rules={[{ required: true }]}>
            <Input type="number" placeholder="请输入零售价" step="0.01" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Products;
