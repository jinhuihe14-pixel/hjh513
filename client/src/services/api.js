import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const employeesAPI = {
  getAll: (params) => api.get('/employees', { params }),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`)
};

export const materialsAPI = {
  getAll: (params) => api.get('/materials', { params }),
  create: (data) => api.post('/materials', data),
  update: (id, data) => api.put(`/materials/${id}`, data),
  getInbound: (params) => api.get('/materials/inbound', { params }),
  createInbound: (data) => api.post('/materials/inbound', data),
  getPurchaseSuggestions: () => api.get('/materials/purchase-suggestions'),
  generatePurchaseSuggestions: () => api.post('/materials/generate-purchase-suggestions')
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  getGiftBoxItems: (id) => api.get(`/products/${id}/gift-box-items`)
};

export const roastingAPI = {
  getAll: (params) => api.get('/roasting', { params }),
  create: (data) => api.post('/roasting', data),
  getLossStatistics: (params) => api.get('/roasting/loss-statistics', { params }),
  getDailySummary: (params) => api.get('/roasting/daily-summary', { params })
};

export const retailAPI = {
  getOrders: (params) => api.get('/retail/orders', { params }),
  getOrder: (id) => api.get(`/retail/orders/${id}`),
  createOrder: (data) => api.post('/retail/orders', data),
  deleteOrder: (id) => api.delete(`/retail/orders/${id}`),
  getDailySalesSummary: (params) => api.get('/retail/daily-sales-summary', { params })
};

export const salaryAPI = {
  getConfig: () => api.get('/salary/config'),
  updateConfig: (key, value) => api.put(`/salary/config/${key}`, { config_value: value }),
  getBonusPenaltyRules: () => api.get('/salary/bonus-penalty-rules'),
  createBonusPenaltyRule: (data) => api.post('/salary/bonus-penalty-rules', data),
  getEmployeeBonusPenalty: (params) => api.get('/salary/employee-bonus-penalty', { params }),
  createEmployeeBonusPenalty: (data) => api.post('/salary/employee-bonus-penalty', data),
  calculateDaily: (params) => api.get('/salary/calculate-daily', { params }),
  getMonthlySettlement: (params) => api.get('/salary/monthly-settlement', { params }),
  calculateMonthlySettlement: (month) => api.post('/salary/calculate-monthly-settlement', { month }),
  updateMonthlySettlement: (id, data) => api.put(`/salary/monthly-settlement/${id}`, data),
  lockMonthlySettlement: (id) => api.post(`/salary/monthly-settlement/${id}/lock`)
};

export const statisticsAPI = {
  getDashboard: () => api.get('/statistics/dashboard'),
  getSalesTrend: (params) => api.get('/statistics/sales-trend', { params }),
  getProductProfit: (params) => api.get('/statistics/product-profit', { params }),
  getUnsalableProducts: (params) => api.get('/statistics/unsalable-products', { params }),
  getLossStatisticsMonthly: (params) => api.get('/statistics/loss-statistics-monthly', { params }),
  getCategorySales: (params) => api.get('/statistics/category-sales', { params })
};

export default api;
