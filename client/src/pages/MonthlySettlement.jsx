import React, { useState, useEffect } from 'react';
import { 
  Table, Button, message, Typography, Space, Select, Modal, Form, 
  InputNumber, Input, Tag, Row, Col, Statistic, Card
} from 'antd';
import { ReloadOutlined, LockOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { salaryAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

function MonthlySettlement() {
  const [settlements, setSettlements] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedMonth) {
      loadSettlements();
    }
  }, [selectedMonth]);

  const loadSettlements = async () => {
    try {
      const res = await salaryAPI.getMonthlySettlement({ month: selectedMonth });
      setSettlements(res.data);
    } catch (error) {
      message.error('加载失败');
    }
  };

  const handleCalculate = async () => {
    try {
      setLoading(true);
      await salaryAPI.calculateMonthlySettlement(selectedMonth);
      message.success('薪资计算完成');
      loadSettlements();
    } catch (error) {
      message.error('计算失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setEditModalVisible(true);
  };

  const handleSubmitEdit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await salaryAPI.updateMonthlySettlement(editingItem.id, values);
      message.success('更新成功');
      setEditModalVisible(false);
      loadSettlements();
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = (id) => {
    Modal.confirm({
      title: '确认锁定',
      content: '锁定后薪资数据将无法修改，确定要锁定吗？',
      onOk: async () => {
        try {
          await salaryAPI.lockMonthlySettlement(id);
          message.success('锁定成功');
          loadSettlements();
        } catch (error) {
          message.error('锁定失败');
        }
      }
    });
  };

  const totalSalary = settlements.reduce((sum, s) => sum + s.final_salary, 0);
  const operatorSalary = settlements.filter(s => s.role === 'operator').reduce((sum, s) => sum + s.final_salary, 0);
  const salespersonSalary = settlements.filter(s => s.role === 'salesperson').reduce((sum, s) => sum + s.final_salary, 0);

  const columns = [
    { title: '员工姓名', dataIndex: 'employee_name', key: 'employee_name' },
    { title: '角色', dataIndex: 'role', key: 'role',
      render: (v) => {
        const map = { operator: '操作工', salesperson: '营业员', admin: '管理员' };
        return map[v] || v;
      }
    },
    { title: '基本工资', dataIndex: 'base_salary', key: 'base_salary',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '计件工资', dataIndex: 'piece_rate_salary', key: 'piece_rate_salary',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '提成工资', dataIndex: 'commission_salary', key: 'commission_salary',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '奖励', dataIndex: 'bonus', key: 'bonus',
      render: (v) => <span style={{ color: '#3f8600' }}>+¥{v.toFixed(2)}</span>
    },
    { title: '罚款', dataIndex: 'penalty', key: 'penalty',
      render: (v) => <span style={{ color: '#cf1322' }}>-¥{v.toFixed(2)}</span>
    },
    { title: '实发工资', dataIndex: 'final_salary', key: 'final_salary',
      render: (v) => <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>¥{v.toFixed(2)}</span>
    },
    { title: '状态', dataIndex: 'is_locked', key: 'is_locked',
      render: (v) => v 
        ? <Tag color="green" icon={<LockOutlined />}>已锁定</Tag> 
        : <Tag color="orange">待确认</Tag>
    },
    { title: '操作', key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            disabled={record.is_locked}
          >
            调整
          </Button>
          {!record.is_locked && (
            <Button 
              type="link" 
              danger
              icon={<LockOutlined />} 
              onClick={() => handleLock(record.id)}
            >
              锁定
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <Title level={3}>月度薪资结算</Title>
        <Space>
          <Select
            style={{ width: 150 }}
            value={selectedMonth}
            onChange={setSelectedMonth}
            picker="month"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const date = dayjs().subtract(i, 'month');
              return (
                <Select.Option key={date.format('YYYY-MM')} value={date.format('YYYY-MM')}>
                  {date.format('YYYY年MM月')}
                </Select.Option>
              );
            })}
          </Select>
          <Button type="primary" icon={<ReloadOutlined />} onClick={handleCalculate} loading={loading}>
            重新计算薪资
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="工资总额"
              value={totalSalary}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="操作工总工资"
              value={operatorSalary}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="营业员总工资"
              value={salespersonSalary}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={settlements}
          rowKey="id"
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>合计</Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                ¥{settlements.reduce((sum, s) => sum + s.base_salary, 0).toFixed(2)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                ¥{settlements.reduce((sum, s) => sum + s.piece_rate_salary, 0).toFixed(2)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                ¥{settlements.reduce((sum, s) => sum + s.commission_salary, 0).toFixed(2)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <span style={{ color: '#3f8600' }}>
                  +¥{settlements.reduce((sum, s) => sum + s.bonus, 0).toFixed(2)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                <span style={{ color: '#cf1322' }}>
                  -¥{settlements.reduce((sum, s) => sum + s.penalty, 0).toFixed(2)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7}>
                <strong style={{ color: '#fa8c16' }}>¥{totalSalary.toFixed(2)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8}></Table.Summary.Cell>
              <Table.Summary.Cell index={9}></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </div>

      <Modal
        title="调整薪资"
        open={editModalVisible}
        onOk={handleSubmitEdit}
        onCancel={() => setEditModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="员工姓名">
            <Input value={editingItem?.employee_name} disabled />
          </Form.Item>
          <Form.Item name="base_salary" label="基本工资">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="piece_rate_salary" label="计件工资">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="commission_salary" label="提成工资">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="bonus" label="奖励">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="penalty" label="罚款">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default MonthlySettlement;
