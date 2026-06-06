import React, { useState, useEffect } from 'react';
import { Table, Button, message, Typography, Space, DatePicker, Select, Tag, Modal } from 'antd';
import { ReloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { retailAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

function RetailOrders() {
  const [orders, setOrders] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [orderType, setOrderType] = useState();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const params = {};
      if (dateRange && dateRange.length === 2) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      if (orderType) {
        params.order_type = orderType;
      }
      
      const res = await retailAPI.getOrders(params);
      setOrders(res.data);
    } catch (error) {
      message.error('加载失败');
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await retailAPI.getOrder(id);
      setOrderDetail(res.data);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('加载失败');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除订单后库存将自动恢复，确定要删除此订单吗？',
      onOk: async () => {
        try {
          await retailAPI.deleteOrder(id);
          message.success('删除成功');
          loadOrders();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const columns = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 150 },
    { title: '订单日期', dataIndex: 'order_date', key: 'order_date' },
    { title: '订单类型', dataIndex: 'order_type', key: 'order_type',
      render: (v) => v === 'retail' ? <Tag color="blue">零售</Tag> : <Tag color="purple">批发</Tag>
    },
    { title: '营业员', dataIndex: 'salesperson_name', key: 'salesperson_name' },
    { title: '客户姓名', dataIndex: 'customer_name', key: 'customer_name' },
    { title: '联系电话', dataIndex: 'customer_phone', key: 'customer_phone' },
    { title: '订单金额', dataIndex: 'total_amount', key: 'total_amount',
      render: (v) => <span style={{ fontWeight: 'bold', color: '#cf1322' }}>¥{v.toFixed(2)}</span>
    },
    { title: '操作', key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
            详情
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  const detailColumns = [
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name' },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price',
      render: (v) => `¥${v.toFixed(2)}`
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity',
      render: (v, r) => `${v} ${r.unit}`
    },
    { title: '小计', dataIndex: 'subtotal', key: 'subtotal',
      render: (v) => `¥${v.toFixed(2)}`
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <Title level={3}>销售订单</Title>
        <Space>
          <RangePicker 
            value={dateRange} 
            onChange={setDateRange}
            placeholder={['开始日期', '结束日期']}
          />
          <Select
            style={{ width: 120 }}
            placeholder="订单类型"
            value={orderType}
            onChange={setOrderType}
            allowClear
          >
            <Select.Option value="retail">零售</Select.Option>
            <Select.Option value="wholesale">批发</Select.Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadOrders}>
            查询
          </Button>
        </Space>
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {orderDetail && (
          <div>
            <p><strong>订单号：</strong>{orderDetail.order_no}</p>
            <p><strong>订单日期：</strong>{orderDetail.order_date}</p>
            <p><strong>营业员：</strong>{orderDetail.salesperson_name}</p>
            <p><strong>订单类型：</strong>{orderDetail.order_type === 'retail' ? '零售' : '批发'}</p>
            {orderDetail.customer_name && (
              <p><strong>客户：</strong>{orderDetail.customer_name} {orderDetail.customer_phone}</p>
            )}
            
            <Table
              columns={detailColumns}
              dataSource={orderDetail.items}
              rowKey="id"
              pagination={false}
              size="small"
              style={{ marginTop: 16 }}
            />
            
            <div style={{ textAlign: 'right', marginTop: 16, fontSize: 18, fontWeight: 'bold' }}>
              总计：<span style={{ color: '#cf1322' }}>¥{orderDetail.total_amount.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default RetailOrders;
