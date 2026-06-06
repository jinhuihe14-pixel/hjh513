import React, { useState, useEffect } from 'react';
import { Table, Button, message, Typography, Space, Tag } from 'antd';
import { ReloadOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { materialsAPI } from '../services/api';

const { Title } = Typography;

function PurchaseSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const res = await materialsAPI.getPurchaseSuggestions();
      setSuggestions(res.data);
    } catch (error) {
      message.error('加载失败');
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await materialsAPI.generatePurchaseSuggestions();
      message.success(`生成了 ${res.data.generated_count} 条采购建议`);
      loadSuggestions();
    } catch (error) {
      message.error('生成失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '原料名称', dataIndex: 'material_name', key: 'material_name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '当前库存', dataIndex: 'current_stock', key: 'current_stock',
      render: (v, r) => <Tag color="red">{v} {r.unit}</Tag>
    },
    { title: '安全库存', dataIndex: 'safety_stock', key: 'safety_stock',
      render: (v, r) => `${v} ${r.unit}`
    },
    { title: '建议采购量', dataIndex: 'suggested_quantity', key: 'suggested_quantity',
      render: (v, r) => <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>{v} {r.unit}</span>
    },
    { title: '参考成本', dataIndex: 'avg_cost', key: 'avg_cost',
      render: (v, r) => `¥${v?.toFixed(2) || 0} / ${r.unit}`
    },
    { title: '预估金额', key: 'estimated',
      render: (_, r) => `¥${((r.avg_cost || 0) * r.suggested_quantity).toFixed(2)}`
    },
    { title: '生成日期', dataIndex: 'generated_date', key: 'generated_date' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>采购建议</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSuggestions}>
            刷新
          </Button>
          <Button 
            type="primary" 
            icon={<ShoppingCartOutlined />} 
            onClick={handleGenerate}
            loading={loading}
          >
            生成采购建议
          </Button>
        </Space>
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={suggestions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>
    </div>
  );
}

export default PurchaseSuggestions;
