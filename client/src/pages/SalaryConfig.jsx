import React, { useState, useEffect } from 'react';
import { 
  Card, Form, InputNumber, Button, message, Typography, Table, Modal, 
  Input, Select, Space, Divider, Row, Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import { salaryAPI, employeesAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

function SalaryConfig() {
  const [configs, setConfigs] = useState([]);
  const [rules, setRules] = useState([]);
  const [bonusPenaltyRecords, setBonusPenaltyRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dailySalary, setDailySalary] = useState(null);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [bpModalVisible, setBpModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [bpForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadDailySalary();
    }
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const [configRes, rulesRes, bpRes, employeesRes] = await Promise.all([
        salaryAPI.getConfig(),
        salaryAPI.getBonusPenaltyRules(),
        salaryAPI.getEmployeeBonusPenalty(),
        employeesAPI.getAll()
      ]);
      setConfigs(configRes.data);
      setRules(rulesRes.data);
      setBonusPenaltyRecords(bpRes.data);
      setEmployees(employeesRes.data.filter(e => e.status === 'active'));
    } catch (error) {
      message.error('加载失败');
    }
  };

  const loadDailySalary = async () => {
    try {
      const res = await salaryAPI.calculateDaily({ date: selectedDate });
      setDailySalary(res.data);
    } catch (error) {
      console.error('加载日薪资失败');
    }
  };

  const handleConfigChange = async (key, value) => {
    try {
      await salaryAPI.updateConfig(key, value);
      message.success('配置更新成功');
      loadData();
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleAddRule = () => {
    form.resetFields();
    setRuleModalVisible(true);
  };

  const handleSubmitRule = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await salaryAPI.createBonusPenaltyRule(values);
      message.success('规则添加成功');
      setRuleModalVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBP = () => {
    bpForm.resetFields();
    bpForm.setFieldsValue({ record_date: dayjs() });
    setBpModalVisible(true);
  };

  const handleSubmitBP = async () => {
    try {
      const values = await bpForm.validateFields();
      setLoading(true);
      await salaryAPI.createEmployeeBonusPenalty({
        ...values,
        record_date: values.record_date.format('YYYY-MM-DD')
      });
      message.success('记录添加成功');
      setBpModalVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const ruleColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type',
      render: (v) => v === 'bonus' ? '奖励' : '处罚'
    },
    { title: '金额', dataIndex: 'amount', key: 'amount',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '说明', dataIndex: 'description', key: 'description' },
    { title: '状态', dataIndex: 'is_active', key: 'is_active',
      render: (v) => v ? '启用' : '禁用'
    }
  ];

  const bpColumns = [
    { title: '日期', dataIndex: 'record_date', key: 'record_date' },
    { title: '员工', dataIndex: 'employee_name', key: 'employee_name' },
    { title: '类型', dataIndex: 'type', key: 'type',
      render: (v) => v === 'bonus' ? <span style={{ color: '#3f8600' }}>奖励</span> : <span style={{ color: '#cf1322' }}>处罚</span>
    },
    { title: '金额', dataIndex: 'amount', key: 'amount',
      render: (v, r) => r.type === 'bonus' ? `+¥${v.toFixed(2)}` : `-¥${v.toFixed(2)}`
    },
    { title: '原因', dataIndex: 'reason', key: 'reason' }
  ];

  return (
    <div>
      <Title level={3}>薪资配置</Title>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="薪资参数配置" style={{ marginBottom: 16 }}>
            {configs.map(config => (
              <Form.Item key={config.config_key} label={config.config_name} style={{ marginBottom: 16 }}>
                <InputNumber
                  style={{ width: '100%' }}
                  value={config.config_value}
                  onChange={(v) => handleConfigChange(config.config_key, v)}
                  step={0.01}
                  min={0}
                />
              </Form.Item>
            ))}
          </Card>
        </Col>

        <Col span={12}>
          <Card title="当日薪资预估" style={{ marginBottom: 16 }}>
            <Space style={{ marginBottom: 16 }}>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Button onClick={loadDailySalary}>刷新</Button>
            </Space>
            
            {dailySalary && (
              <div>
                <Title level={5}>操作工计件薪资</Title>
                <Table
                  size="small"
                  dataSource={dailySalary.operatorSalaries}
                  rowKey="employee_id"
                  pagination={false}
                  columns={[
                    { title: '姓名', dataIndex: 'employee_name', key: 'name' },
                    { title: '产量(斤)', dataIndex: 'total_output', key: 'output' },
                    { title: '计件单价', dataIndex: 'piece_rate', key: 'rate', render: v => `¥${v}/斤` },
                    { title: '薪资', dataIndex: 'salary', key: 'salary', render: v => `¥${v.toFixed(2)}` }
                  ]}
                />
                
                <Divider />
                
                <Title level={5}>营业员提成薪资</Title>
                <Table
                  size="small"
                  dataSource={dailySalary.salespersonSalaries}
                  rowKey="employee_id"
                  pagination={false}
                  columns={[
                    { title: '姓名', dataIndex: 'employee_name', key: 'name' },
                    { title: '销售额', dataIndex: 'total_sales', key: 'sales', render: v => `¥${v.toFixed(2)}` },
                    { title: '提成', dataIndex: 'total_commission', key: 'commission', render: v => `¥${v.toFixed(2)}` }
                  ]}
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card 
        title="奖罚规则" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRule}>
            添加规则
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={ruleColumns}
          dataSource={rules}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Card 
        title="员工奖罚记录" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBP}>
            添加记录
          </Button>
        }
      >
        <Table
          columns={bpColumns}
          dataSource={bonusPenaltyRecords}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="添加奖罚规则"
        open={ruleModalVisible}
        onOk={handleSubmitRule}
        onCancel={() => setRuleModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
            <Input placeholder="请输入规则名称" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="bonus">奖励</Select.Option>
              <Select.Option value="penalty">处罚</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="金额(元)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} placeholder="请输入规则说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加奖罚记录"
        open={bpModalVisible}
        onOk={handleSubmitBP}
        onCancel={() => setBpModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={bpForm} layout="vertical">
          <Form.Item name="record_date" label="日期" rules={[{ required: true }]}>
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="employee_id" label="员工" rules={[{ required: true }]}>
            <Select placeholder="请选择员工">
              {employees.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="bonus">奖励</Select.Option>
              <Select.Option value="penalty">处罚</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="金额(元)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="reason" label="原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入奖罚原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SalaryConfig;
