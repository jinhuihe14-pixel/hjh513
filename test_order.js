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
        resolve({ statusCode: res.statusCode, body: body });
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function test() {
  console.log('=== 测试1: 不填客户信息下单 ===');
  const r1 = await makeRequest('/api/retail/orders', 'POST', {
    order_date: '2026-06-06',
    salesperson_id: 3,
    order_type: 'retail',
    member_level: 'gold',
    items: [{ product_id: 1, quantity: 1 }]
  });
  console.log(`Status: ${r1.statusCode}`);
  console.log(`Body: ${r1.body}`);
  console.log();

  console.log('=== 测试2: 填空字符串客户信息 ===');
  const r2 = await makeRequest('/api/retail/orders', 'POST', {
    order_date: '2026-06-06',
    salesperson_id: 3,
    order_type: 'retail',
    member_level: 'gold',
    customer_name: '',
    customer_phone: '',
    remark: '',
    items: [{ product_id: 2, quantity: 1 }]
  });
  console.log(`Status: ${r2.statusCode}`);
  console.log(`Body: ${r2.body}`);
  console.log();

  console.log('=== 测试3: 获取订单列表 ===');
  const r3 = await makeRequest('/api/retail/orders', 'GET');
  console.log(`Status: ${r3.statusCode}`);
  console.log(`Body: ${r3.body}`);
}

test().catch(console.error);
