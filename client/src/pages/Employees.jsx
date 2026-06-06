import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { employeesAPI } from '../services/api';

const { Title } = Typography;

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await employeesAPI.getAll();
      setEmployees(res.data);
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
        await employeesAPI.update(editingItem.id, values);
        message.success('更新成功');
      } else {
        await employeesAPI.create(values);
        message.success('添加成功');
      }
      
      setModalVisible(false);
      loadEmployees();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const roleMap = {
    operator: '操作工',
    salesperson: '营业员',
    admin: '管理员'
  };

  const roleColors = {
    operator: 'blue',
    salesperson: 'green',
    admin: 'purple'
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '角色', dataIndex: 'role', key: 'role',
      render: (v) => <Tag color={roleColors[v]}>{roleMap[v]}</Tag>
    },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (v) => v === 'active' 
        ? <Tag color="green">在职</Tag> 
        : <Tag color="gray">离职</Tag>
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    { title: '操作', key: 'action', render: (_, record) => (
      <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
        编辑
      </Button>
    )}
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>员工管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加员工
        </Button>
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title={editingItem ? '编辑员工' : '添加员工'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select placeholder="请选择角色">
              <Select.Option value="operator">操作工</Select.Option>
              <Select.Option value="salesperson">营业员</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          {editingItem && (
            <Form.Item name="status" label="状态">
              <Select>
                <Select.Option value="active">在职</Select.Option>
                <Select.Option value="inactive">离职</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

export default Employees;
