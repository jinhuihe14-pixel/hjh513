import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Typography, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { materialsAPI } from '../services/api';

const { Title } = Typography;

function Materials() {
  const [materials, setMaterials] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const res = await materialsAPI.getAll();
      setMaterials(res.data);
    } catch (error) {
      message.error('加载失败');
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (editingItem) {
        await materialsAPI.update(editingItem.id, values);
        message.success('更新成功');
      } else {
        await materialsAPI.create(values);
        message.success('添加成功');
      }
      
      setModalVisible(false);
      loadMaterials();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '原料名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '单位', dataIndex: 'unit', key: 'unit' },
    { title: '当前库存', dataIndex: 'current_stock', key: 'current_stock', 
      render: (v, r) => `${v || 0} ${r.unit}` 
    },
    { title: '安全库存', dataIndex: 'safety_stock', key: 'safety_stock',
      render: (v, r) => `${v} ${r.unit}`
    },
    { title: '平均成本', dataIndex: 'avg_cost', key: 'avg_cost',
      render: (v) => `¥${v?.toFixed(2) || 0}`
    },
    { title: '状态', key: 'status', render: (_, r) => 
      r.current_stock < r.safety_stock 
        ? <Tag color="red">库存不足</Tag> 
        : <Tag color="green">正常</Tag>
    },
    { title: '操作', key: 'action', render: (_, record) => (
      <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
        编辑
      </Button>
    )}
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>原料管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加原料
        </Button>
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={materials}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title={editingItem ? '编辑原料' : '添加原料'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="原料名称" rules={[{ required: true }]}>
            <Input placeholder="请输入原料名称" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select placeholder="请选择分类">
              <Select.Option value="瓜子">瓜子</Select.Option>
              <Select.Option value="花生">花生</Select.Option>
              <Select.Option value="坚果">坚果</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="unit" label="单位" initialValue="斤">
            <Input placeholder="请输入单位" />
          </Form.Item>
          <Form.Item name="safety_stock" label="安全库存" initialValue={50}>
            <Input type="number" placeholder="请输入安全库存" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Materials;
