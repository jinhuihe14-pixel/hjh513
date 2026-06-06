const http = require('http');

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function test() {
  console.log('========== 测试1: 散客下单 - 不填任何客户信息 ==========');
  const productBefore = await makeRequest('/api/products', 'GET');
  const product1 = productBefore.body.find(p => p.id === 1);
  console.log(`下单前 - 原味瓜子库存: ${product1.current_stock}斤`);
  
  const r1 = await makeRequest('/api/retail/orders', 'POST', {
    order_date: '2026-06-06',
    salesperson_id: 3,
    order_type: 'retail',
    member_level: 'gold',
    items: [{ product_id: 1, quantity: 2 }]
  });
  console.log(`状态: ${r1.statusCode}`);
  console.log(`结果: ${JSON.stringify(r1.body)}`);
  if (r1.statusCode === 200) {
    console.log('✅ 不填客户信息下单成功!');
    console.log(`   订单金额: ¥${r1.body.total_amount} (金卡9折: 15*0.9*2 = 27元)`);
  } else {
    console.log('❌ 下单失败');
  }
  console.log();

  console.log('========== 测试2: 散客下单 - 只填一半客户信息 ==========');
  const r2 = await makeRequest('/api/retail/orders', 'POST', {
    order_date: '2026-06-06',
    salesperson_id: 3,
    order_type: 'retail',
    member_level: 'normal',
    customer_name: '张',
    items: [{ product_id: 3, quantity: 1 }]
  });
  console.log(`状态: ${r2.statusCode}`);
  if (r2.statusCode === 200) {
    console.log('✅ 只填部分客户信息下单成功!');
  } else {
    console.log('❌ 下单失败');
  }
  console.log();

  console.log('========== 测试3: 验证库存扣减 ==========');
  const productAfter = await makeRequest('/api/products', 'GET');
  const product1After = productAfter.body.find(p => p.id === 1);
  console.log(`下单后 - 原味瓜子库存: ${product1After.current_stock}斤`);
  const expectedStock = product1.current_stock - 2;
  if (product1After.current_stock === expectedStock) {
    console.log('✅ 库存扣减正确!');
  } else {
    console.log(`❌ 库存扣减不正确，预期: ${expectedStock}斤`);
  }
  console.log();

  console.log('========== 测试4: 生成当日薪资日汇总 ==========');
  const r4 = await makeRequest('/api/salary/generate-daily-summary', 'POST', {
    date: '2026-06-06'
  });
  console.log(`状态: ${r4.statusCode}`);
  console.log(`结果: ${JSON.stringify(r4.body)}`);
  console.log();

  console.log('========== 测试5: 查看营业员日汇总(退单前) ==========');
  const r5 = await makeRequest('/api/salary/daily-summary?start_date=2026-06-06&end_date=2026-06-06', 'GET');
  const summariesBefore = r5.body.filter(s => s.employee_id === 3 && s.summary_date === '2026-06-06');
  if (summariesBefore.length > 0) {
    const s = summariesBefore[0];
    console.log(`营业员: ${s.employee_name}`);
    console.log(`零售销售额: ¥${s.retail_sales?.toFixed(2) || 0}`);
    console.log(`零售提成: ¥${s.retail_commission?.toFixed(2) || 0}`);
    console.log(`总提成: ¥${s.total_commission?.toFixed(2) || 0}`);
  }
  console.log();

  console.log('========== 测试6: 获取订单列表，找到刚下的金卡订单 ==========');
  const ordersBefore = await makeRequest('/api/retail/orders?start_date=2026-06-06&end_date=2026-06-06&salesperson_id=3', 'GET');
  const goldOrder = ordersBefore.body.find(o => o.member_level === 'gold' && o.total_amount > 20);
  if (goldOrder) {
    console.log(`找到金卡订单: ${goldOrder.order_no}, 金额: ¥${goldOrder.total_amount}`);
    console.log();
    
    console.log('========== 测试7: 退掉这张金卡订单 ==========');
    const r7 = await makeRequest(`/api/retail/orders/${goldOrder.id}`, 'DELETE');
    console.log(`退单状态: ${r7.statusCode}`);
    console.log(`退单结果: ${JSON.stringify(r7.body)}`);
    if (r7.statusCode === 200) {
      console.log('✅ 退单成功!');
    }
    console.log();

    console.log('========== 测试8: 验证库存退回 ==========');
    const productAfterRefund = await makeRequest('/api/products', 'GET');
    const product1Refund = productAfterRefund.body.find(p => p.id === 1);
    console.log(`退单后 - 原味瓜子库存: ${product1Refund.current_stock}斤`);
    if (product1Refund.current_stock === product1.current_stock) {
      console.log('✅ 库存已正确退回!');
    } else {
      console.log(`❌ 库存退回不正确，预期: ${product1.current_stock}斤`);
    }
    console.log();

    console.log('========== 测试9: 验证订单已删除 ==========');
    const ordersAfter = await makeRequest('/api/retail/orders?start_date=2026-06-06&end_date=2026-06-06', 'GET');
    const orderStillExists = ordersAfter.body.some(o => o.id === goldOrder.id);
    if (!orderStillExists) {
      console.log('✅ 订单已从列表中删除!');
    } else {
      console.log('❌ 订单仍然存在');
    }
    console.log();

    console.log('========== 测试10: 查看退单后的日汇总 ==========');
    const r10 = await makeRequest('/api/salary/daily-summary?start_date=2026-06-06&end_date=2026-06-06', 'GET');
    const summariesAfter = r10.body.filter(s => s.employee_id === 3 && s.summary_date === '2026-06-06');
    if (summariesAfter.length > 0 && summariesBefore.length > 0) {
      const before = summariesBefore[0];
      const after = summariesAfter[0];
      console.log(`营业员: ${after.employee_name}`);
      console.log(`退单前零售销售额: ¥${before.retail_sales?.toFixed(2) || 0}`);
      console.log(`退单后零售销售额: ¥${after.retail_sales?.toFixed(2) || 0}`);
      console.log(`退单前零售提成: ¥${before.retail_commission?.toFixed(2) || 0}`);
      console.log(`退单后零售提成: ¥${after.retail_commission?.toFixed(2) || 0}`);
      
      const expectedSalesDeduct = goldOrder.total_amount;
      const expectedCommissionDeduct = goldOrder.total_amount * 0.02;
      const actualSalesDeduct = (before.retail_sales || 0) - (after.retail_sales || 0);
      const actualCommissionDeduct = (before.retail_commission || 0) - (after.retail_commission || 0);
      
      console.log();
      console.log(`预期扣减销售额: ¥${expectedSalesDeduct.toFixed(2)}`);
      console.log(`实际扣减销售额: ¥${actualSalesDeduct.toFixed(2)}`);
      console.log(`预期扣减提成: ¥${expectedCommissionDeduct.toFixed(2)}`);
      console.log(`实际扣减提成: ¥${actualCommissionDeduct.toFixed(2)}`);
      
      if (Math.abs(actualSalesDeduct - expectedSalesDeduct) < 0.01 && 
          Math.abs(actualCommissionDeduct - expectedCommissionDeduct) < 0.01) {
        console.log('✅ 退单后销售额和提成已正确扣减(按折后金额)!');
      } else {
        console.log('❌ 扣减金额不正确');
      }
    }
  }

  console.log();
  console.log('========== 所有测试完成 ==========');
}

test().catch(console.error);
