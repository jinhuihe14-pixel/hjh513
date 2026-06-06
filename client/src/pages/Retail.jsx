import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Row, Col, Input, Button, Table, Select, Form, DatePicker, 
  InputNumber, message, Typography, Space, Divider, Statistic, Tag
} from 'antd';
import { PlusOutlined, MinusOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { retailAPI, productsAPI, employeesAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const MEMBER_DISCOUNTS = {
  normal: 1.0,
  silver: 0.95,
  gold: 0.9
};

const MEMBER_LEVELS = [
  { value: 'normal', label: '普通会员', color: 'default' },
  { value: 'silver', label: '银卡会员', color: 'blue' },
  { value: 'gold', label: '金卡会员', color: 'gold' }
];

function calculateProductPrice(product, orderType, memberLevel) {
  if (orderType === 'wholesale') {
    return product.wholesale_price || product.retail_price;
  }
  
  if (product.is_gift_box) {
    return product.retail_price;
  }
  
  const discount = MEMBER_DISCOUNTS[memberLevel] || 1.0;
  return Math.round(product.retail_price * discount * 100) / 100;
}

function Retail() {
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [cart, setCart] = useState([]);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState('retail');
  const [memberLevel, setMemberLevel] = useState('normal');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, employeesRes] = await Promise.all([
        productsAPI.getAll(),
        employeesAPI.getAll({ role: 'salesperson' })
      ]);
      setProducts(productsRes.data);
      setSalespersons(employeesRes.data.filter(e => e.status === 'active'));
    } catch (error) {
      message.error('加载失败');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.includes(searchText) && p.current_stock > 0
  );

  const getDisplayPrice = (product) => {
    return calculateProductPrice(product, orderType, memberLevel);
  };

  const addToCart = (product) => {
    const displayPrice = getDisplayPrice(product);
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: Math.min(item.quantity + 1, product.current_stock) }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        unit_price: displayPrice,
        original_price: product.retail_price,
        wholesale_price: product.wholesale_price,
        is_gift_box: product.is_gift_box,
        quantity: 1,
        stock: product.current_stock
      }];
    });
  };

  useEffect(() => {
    setCart(prev => prev.map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return item;
      const newPrice = calculateProductPrice(product, orderType, memberLevel);
      return {
        ...item,
        unit_price: newPrice,
        original_price: product.retail_price,
        wholesale_price: product.wholesale_price
      };
    }));
  }, [orderType, memberLevel, products]);

  const updateCartQuantity = (productId, quantity) => {
    setCart(prev => prev.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: Math.max(0, Math.min(quantity, item.stock)) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [cart]);

  const originalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.original_price, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.round((originalAmount - totalAmount) * 100) / 100;
  }, [originalAmount, totalAmount]);

  const handleOrderTypeChange = (value) => {
    setOrderType(value);
    if (value === 'wholesale') {
      setMemberLevel('normal');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (cart.length === 0) {
        message.warning('请添加商品到购物车');
        return;
      }

      setLoading(true);
      
      const data = {
        order_date: values.order_date.format('YYYY-MM-DD'),
        salesperson_id: values.salesperson_id,
        order_type: orderType,
        member_level: orderType === 'wholesale' ? 'normal' : memberLevel,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        remark: values.remark,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.product_name
        }))
      };
      
      await retailAPI.createOrder(data);
      message.success('订单创建成功');
      clearCart();
      form.resetFields();
      loadData();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const cartColumns = [
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name' },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price',
      render: (v, record) => (
        <div>
          <div style={{ color: '#fa8c16', fontWeight: 'bold' }}>¥{v.toFixed(2)}</div>
          {record.is_gift_box && orderType === 'retail' && memberLevel !== 'normal' && (
            <div style={{ fontSize: 12, color: '#999' }}>礼盒不参与折扣</div>
          )}
          {!record.is_gift_box && orderType === 'retail' && memberLevel !== 'normal' && v !== record.original_price && (
            <div style={{ fontSize: 12, color: '#999', textDecoration: 'line-through' }}>
              ¥{record.original_price.toFixed(2)}
            </div>
          )}
        </div>
      )
    },
    { title: '数量', key: 'quantity',
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            icon={<MinusOutlined />} 
            onClick={() => updateCartQuantity(record.product_id, record.quantity - 1)}
          />
          <InputNumber
            min={1}
            max={record.stock}
            value={record.quantity}
            onChange={(v) => updateCartQuantity(record.product_id, v)}
            style={{ width: 80 }}
          />
          <Button 
            size="small" 
            icon={<PlusOutlined />} 
            onClick={() => updateCartQuantity(record.product_id, record.quantity + 1)}
          />
        </Space>
      )
    },
    { title: '小计', key: 'subtotal',
      render: (_, record) => `¥${(record.quantity * record.unit_price).toFixed(2)}`
    },
    { title: '操作', key: 'action',
      render: (_, record) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => removeFromCart(record.product_id)}
        />
      )
    }
  ];

  return (
    <div>
      <Title level={3}>前台零售</Title>
      
      <Row gutter={16}>
        <Col span={16}>
          <Card title="商品列表" style={{ marginBottom: 16 }} extra={
            <Space>
              <span style={{ fontSize: 13, color: '#666' }}>订单类型:</span>
              <Select value={orderType} onChange={handleOrderTypeChange} style={{ width: 120 }} size="small">
                <Option value="retail">零售</Option>
                <Option value="wholesale">批发</Option>
              </Select>
            </Space>
          }>
            <Search
              placeholder="搜索商品名称"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginBottom: 16 }}
              allowClear
            />
            <Row gutter={[16, 16]}>
              {filteredProducts.map(product => {
                const displayPrice = getDisplayPrice(product);
                const hasDiscount = orderType === 'retail' && !product.is_gift_box && memberLevel !== 'normal' && displayPrice !== product.retail_price;
                
                return (
                  <Col key={product.id} xs={12} sm={8} md={6}>
                    <Card 
                      hoverable
                      size="small"
                      onClick={() => addToCart(product)}
                      style={{ cursor: 'pointer' }}
                      bodyStyle={{ padding: 12 }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{product.name}</div>
                      <div style={{ color: '#fa8c16', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                        ¥{displayPrice.toFixed(2)}
                        {hasDiscount && (
                          <span style={{ fontSize: 12, color: '#999', textDecoration: 'line-through', marginLeft: 8 }}>
                            ¥{product.retail_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {product.is_gift_box ? <Tag color="purple">礼盒</Tag> : <Tag color="green">散称</Tag>}
                        库存: {product.current_stock}{product.unit}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card 
            title={
              <Space>
                <ShoppingCartOutlined />
                购物车
                <Tag color="orange">{cart.length}种商品</Tag>
              </Space>
            }
            extra={
              <Button type="text" danger onClick={clearCart} disabled={cart.length === 0}>
                清空
              </Button>
            }
          >
            {orderType === 'retail' && (
              <Form.Item label="会员等级" style={{ marginBottom: 16 }}>
                <Select value={memberLevel} onChange={setMemberLevel} style={{ width: '100%' }}>
                  {MEMBER_LEVELS.map(level => (
                    <Option key={level.value} value={level.value}>
                      <Tag color={level.color}>{level.label}</Tag>
                      {level.value !== 'normal' && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                          散称{Math.round(MEMBER_DISCOUNTS[level.value] * 100)}折
                        </span>
                      )}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Table
              columns={cartColumns}
              dataSource={cart}
              rowKey="product_id"
              pagination={false}
              size="small"
              scroll={{ y: 250 }}
            />
            
            <Divider />
            
            <div style={{ marginBottom: 12 }}>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#999' }}>原价</span>
                  <span style={{ color: '#999', textDecoration: 'line-through' }}>¥{originalAmount.toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#52c41a' }}>会员优惠</span>
                  <span style={{ color: '#52c41a' }}>-¥{discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <Statistic
              title="订单总额"
              value={totalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#cf1322', fontSize: 28 }}
            />

            <Divider />

            <Form form={form} layout="vertical">
              <Form.Item name="order_date" label="订单日期" initialValue={dayjs()} rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="salesperson_id" label="营业员" rules={[{ required: true }]}>
                <Select placeholder="请选择营业员">
                  {salespersons.map(s => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="order_type" label="订单类型" initialValue="retail">
                <Select onChange={handleOrderTypeChange}>
                  <Option value="retail">零售</Option>
                  <Option value="wholesale">批发</Option>
                </Select>
              </Form.Item>
              <Form.Item name="customer_name" label="客户姓名">
                <Input placeholder="批发客户请填写" />
              </Form.Item>
              <Form.Item name="customer_phone" label="联系电话">
                <Input placeholder="批发客户请填写" />
              </Form.Item>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} placeholder="备注信息" />
              </Form.Item>
              
              <Button 
                type="primary" 
                size="large" 
                block 
                onClick={handleSubmit}
                loading={loading}
                disabled={cart.length === 0}
              >
                确认下单
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Retail;
