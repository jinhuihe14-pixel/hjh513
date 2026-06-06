const http = require('http');

function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('========== 会员等级折扣功能测试 ==========\n');

  try {
    console.log('1. 获取产品列表...');
    const productsRes = await apiRequest('GET', '/products');
    const products = productsRes.data;
    const looseProduct = products.find(p => !p.is_gift_box);
    const giftBoxProduct = products.find(p => p.is_gift_box);
    
    console.log(`   散称商品: ${looseProduct.name} - 零售价: ¥${looseProduct.retail_price}, 批发价: ¥${looseProduct.wholesale_price}`);
    console.log(`   礼盒商品: ${giftBoxProduct.name} - 零售价: ¥${giftBoxProduct.retail_price}, 批发价: ¥${giftBoxProduct.wholesale_price}`);
    console.log(`   散称商品库存: ${looseProduct.current_stock}`);
    console.log(`   礼盒商品库存: ${giftBoxProduct.current_stock}`);
    console.log();

    console.log('2. 测试金卡会员零售订单 (散称9折, 礼盒原价)...');
    const stockBeforeLoose = looseProduct.current_stock;
    const stockBeforeGift = giftBoxProduct.current_stock;
    
    const goldOrderRes = await apiRequest('POST', '/retail/orders', {
      order_date: new Date().toISOString().split('T')[0],
      salesperson_id: 3,
      order_type: 'retail',
      member_level: 'gold',
      customer_name: '测试金卡客户',
      customer_phone: '13800000001',
      remark: '测试金卡会员折扣',
      items: [
        { product_id: looseProduct.id, quantity: 2, unit_price: looseProduct.retail_price * 0.9 },
        { product_id: giftBoxProduct.id, quantity: 1, unit_price: giftBoxProduct.retail_price }
      ]
    });

    console.log(`   订单创建结果: ${goldOrderRes.data.success ? '成功' : '失败'}`);
    console.log(`   订单号: ${goldOrderRes.data.order_no}`);
    console.log(`   订单总额: ¥${goldOrderRes.data.total_amount}`);
    console.log(`   会员等级: ${goldOrderRes.data.member_level}`);
    
    const expectedGoldLoose = Math.round(looseProduct.retail_price * 0.9 * 100) / 100;
    const expectedGoldTotal = Math.round((expectedGoldLoose * 2 + giftBoxProduct.retail_price * 1) * 100) / 100;
    console.log(`   预期散称单价: ¥${expectedGoldLoose} (9折)`);
    console.log(`   预期订单总额: ¥${expectedGoldTotal}`);
    console.log(`   价格是否正确: ${Math.abs(goldOrderRes.data.total_amount - expectedGoldTotal) < 0.01 ? '✅ 是' : '❌ 否'}`);
    console.log();

    console.log('3. 验证订单详情...');
    const orderDetailRes = await apiRequest('GET', `/retail/orders/${goldOrderRes.data.order_no ? '' : ''}`.replace('/$', `/${goldOrderRes.data.order_no ? goldOrderRes.data.order_no : ''}`));
    
    const ordersRes = await apiRequest('GET', '/retail/orders');
    const latestOrder = ordersRes.data[0];
    console.log(`   最新订单 ID: ${latestOrder.id}`);
    console.log(`   最新订单总额: ¥${latestOrder.total_amount}`);
    console.log(`   最新订单会员等级: ${latestOrder.member_level}`);
    console.log(`   订单类型: ${latestOrder.order_type}`);
    console.log();

    console.log('4. 验证库存扣减...');
    const productsAfterRes = await apiRequest('GET', '/products');
    const looseAfter = productsAfterRes.data.find(p => p.id === looseProduct.id);
    const giftAfter = productsAfterRes.data.find(p => p.id === giftBoxProduct.id);
    console.log(`   散称商品库存: ${stockBeforeLoose} -> ${looseAfter.current_stock}`);
    console.log(`   扣减数量是否正确: ${looseAfter.current_stock === stockBeforeLoose - 2 ? '✅ 是' : '❌ 否'}`);
    console.log(`   礼盒商品库存: ${stockBeforeGift} -> ${giftAfter.current_stock}`);
    console.log(`   扣减数量是否正确: ${giftAfter.current_stock === stockBeforeGift - 1 ? '✅ 是' : '❌ 否'}`);
    console.log();

    console.log('5. 测试银卡会员零售订单 (散称95折, 礼盒原价)...');
    const silverOrderRes = await apiRequest('POST', '/retail/orders', {
      order_date: new Date().toISOString().split('T')[0],
      salesperson_id: 3,
      order_type: 'retail',
      member_level: 'silver',
      customer_name: '测试银卡客户',
      customer_phone: '13800000002',
      remark: '测试银卡会员折扣',
      items: [
        { product_id: looseProduct.id, quantity: 1, unit_price: looseProduct.retail_price * 0.95 }
      ]
    });

    const expectedSilverLoose = Math.round(looseProduct.retail_price * 0.95 * 100) / 100;
    const expectedSilverTotal = expectedSilverLoose;
    console.log(`   订单创建结果: ${silverOrderRes.data.success ? '成功' : '失败'}`);
    console.log(`   订单总额: ¥${silverOrderRes.data.total_amount}`);
    console.log(`   预期散称单价: ¥${expectedSilverLoose} (95折)`);
    console.log(`   价格是否正确: ${Math.abs(silverOrderRes.data.total_amount - expectedSilverTotal) < 0.01 ? '✅ 是' : '❌ 否'}`);
    console.log();

    console.log('6. 测试普通会员零售订单 (无折扣)...');
    const normalOrderRes = await apiRequest('POST', '/retail/orders', {
      order_date: new Date().toISOString().split('T')[0],
      salesperson_id: 4,
      order_type: 'retail',
      member_level: 'normal',
      customer_name: '测试普通客户',
      customer_phone: '13800000003',
      remark: '测试普通会员无折扣',
      items: [
        { product_id: looseProduct.id, quantity: 1, unit_price: looseProduct.retail_price }
      ]
    });

    console.log(`   订单创建结果: ${normalOrderRes.data.success ? '成功' : '失败'}`);
    console.log(`   订单总额: ¥${normalOrderRes.data.total_amount}`);
    console.log(`   预期总额: ¥${looseProduct.retail_price}`);
    console.log(`   价格是否正确: ${Math.abs(normalOrderRes.data.total_amount - looseProduct.retail_price) < 0.01 ? '✅ 是' : '❌ 否'}`);
    console.log();

    console.log('7. 测试批发订单 (走批发价, 无会员折扣)...');
    const wholesaleOrderRes = await apiRequest('POST', '/retail/orders', {
      order_date: new Date().toISOString().split('T')[0],
      salesperson_id: 3,
      order_type: 'wholesale',
      member_level: 'gold',
      customer_name: '测试批发客户',
      customer_phone: '13800000004',
      remark: '测试批发价,即使传了金卡也不打折',
      items: [
        { product_id: looseProduct.id, quantity: 5, unit_price: looseProduct.wholesale_price },
        { product_id: giftBoxProduct.id, quantity: 2, unit_price: giftBoxProduct.wholesale_price }
      ]
    });

    const expectedWholesaleTotal = looseProduct.wholesale_price * 5 + giftBoxProduct.wholesale_price * 2;
    console.log(`   订单创建结果: ${wholesaleOrderRes.data.success ? '成功' : '失败'}`);
    console.log(`   订单总额: ¥${wholesaleOrderRes.data.total_amount}`);
    console.log(`   预期总额(批发价): ¥${expectedWholesaleTotal}`);
    console.log(`   会员等级(批发应为normal): ${wholesaleOrderRes.data.member_level}`);
    console.log(`   价格是否正确: ${Math.abs(wholesaleOrderRes.data.total_amount - expectedWholesaleTotal) < 0.01 ? '✅ 是' : '❌ 否'}`);
    console.log(`   会员等级是否正确: ${wholesaleOrderRes.data.member_level === 'normal' ? '✅ 是' : '❌ 否'}`);
    console.log();

    console.log('8. 生成薪资日汇总, 验证提成按折后计算...');
    const today = new Date().toISOString().split('T')[0];
    const salaryGenRes = await apiRequest('POST', '/salary/generate-daily-summary', { date: today });
    console.log(`   生成结果: ${salaryGenRes.data.success ? '成功' : '失败'}`);
    console.log(`   营业员数量: ${salaryGenRes.data.salesperson_count}`);

    const dailySummaryRes = await apiRequest('GET', '/salary/daily-summary', { start_date: today, end_date: today });
    const sp3Summary = dailySummaryRes.data.find(s => s.employee_id === 3);
    const sp4Summary = dailySummaryRes.data.find(s => s.employee_id === 4);
    
    if (sp3Summary) {
      console.log(`   营业员3(王五)零售销售额: ¥${sp3Summary.retail_sales}`);
      console.log(`   营业员3(王五)批发销售额: ¥${sp3Summary.wholesale_sales}`);
      console.log(`   营业员3(王五)零售提成: ¥${sp3Summary.retail_commission}`);
      console.log(`   营业员3(王五)批发提成: ¥${sp3Summary.wholesale_commission}`);
      
      const expectedRetailSales3 = expectedGoldTotal + expectedSilverTotal;
      const expectedRetailCommission3 = expectedRetailSales3 * 0.02;
      console.log(`   预期零售销售额(折后): ¥${expectedRetailSales3}`);
      console.log(`   预期零售提成(2%): ¥${expectedRetailCommission3.toFixed(2)}`);
      console.log(`   提成是否按折后计算: ${Math.abs(sp3Summary.retail_commission - expectedRetailCommission3) < 0.01 ? '✅ 是' : '❌ 否'}`);
    }
    
    if (sp4Summary) {
      console.log(`   营业员4(赵六)零售销售额: ¥${sp4Summary.retail_sales}`);
      console.log(`   营业员4(赵六)零售提成: ¥${sp4Summary.retail_commission}`);
      const expectedRetailCommission4 = looseProduct.retail_price * 0.02;
      console.log(`   预期零售提成(2%): ¥${expectedRetailCommission4.toFixed(2)}`);
      console.log(`   提成是否正确: ${Math.abs(sp4Summary.retail_commission - expectedRetailCommission4) < 0.01 ? '✅ 是' : '❌ 否'}`);
    }
    console.log();

    console.log('9. 测试会员等级销售占比统计...');
    const memberStatsRes = await apiRequest('GET', `/statistics/member-level-sales?start_date=${today}&end_date=${today}`);
    console.log(`   零售总销售额: ¥${memberStatsRes.data.total_sales}`);
    console.log(`   各等级销售明细:`);
    memberStatsRes.data.data.forEach(item => {
      console.log(`     ${item.level_name}: ${item.order_count}单, ¥${item.total_sales}, 占比 ${item.percentage}%`);
    });
    
    const goldStat = memberStatsRes.data.data.find(d => d.member_level === 'gold');
    const silverStat = memberStatsRes.data.data.find(d => d.member_level === 'silver');
    const normalStat = memberStatsRes.data.data.find(d => d.member_level === 'normal');
    
    console.log();
    console.log('   验证:');
    console.log(`   金卡销售额是否正确: ${goldStat && Math.abs(goldStat.total_sales - expectedGoldTotal) < 0.01 ? '✅ 是' : '❌ 否'}`);
    console.log(`   银卡销售额是否正确: ${silverStat && Math.abs(silverStat.total_sales - expectedSilverTotal) < 0.01 ? '✅ 是' : '❌ 否'}`);
    console.log(`   普通会员销售额是否正确: ${normalStat && Math.abs(normalStat.total_sales - looseProduct.retail_price) < 0.01 ? '✅ 是' : '❌ 否'}`);
    
    const totalPercentage = memberStatsRes.data.data.reduce((sum, d) => sum + d.percentage, 0);
    console.log(`   占比总和是否约为100%: ${Math.abs(totalPercentage - 100) < 1 ? '✅ 是 (' + totalPercentage.toFixed(1) + '%)' : '❌ 否 (' + totalPercentage.toFixed(1) + '%)'}`);
    console.log();

    console.log('========== 测试完成 ==========');

  } catch (error) {
    console.error('测试出错:', error.message);
  }
}

runTests();
