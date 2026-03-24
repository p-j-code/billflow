import api from './client';

export const authApi = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  refresh:        (data) => api.post('/auth/refresh', data),
  logout:         ()     => api.post('/auth/logout'),
  me:             ()     => api.get('/auth/me'),
  switchBusiness: (id)   => api.patch('/auth/switch-business', { businessId: id }),
};

export const businessApi = {
  list:                ()         => api.get('/business'),
  get:                 (id)       => api.get(`/business/${id}`),
  create:              (data)     => api.post('/business', data),
  update:              (id, data) => api.put(`/business/${id}`, data),
  updateInvoiceSeries: (id, data) => api.patch(`/business/${id}/invoice-series`, data),
  nextInvoiceNumber:   (id, type) => api.get(`/business/${id}/next-invoice-number`, { params: { type } }),
};

export const partyApi = {
  list:    (params)     => api.get('/parties', { params }),
  summary: ()           => api.get('/parties/summary'),
  get:     (id)         => api.get(`/parties/${id}`),
  create:  (data)       => api.post('/parties', data),
  update:  (id, data)   => api.put(`/parties/${id}`, data),
  delete:  (id)         => api.delete(`/parties/${id}`),
};

export const hsnApi = {
  search:    (params) => api.get('/hsn', { params }),
  getByCode: (code)   => api.get(`/hsn/${code}`),
  addCustom: (data)   => api.post('/hsn', data),
  getRates:  ()       => api.get('/hsn/rates'),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
};

export const invoiceApi = {
  list:           (params)   => api.get('/invoices', { params }),
  get:            (id)       => api.get(`/invoices/${id}`),
  create:         (data)     => api.post('/invoices', data),
  update:         (id, data) => api.put(`/invoices/${id}`, data),
  updateStatus:   (id, data) => api.patch(`/invoices/${id}/status`, data),
  delete:         (id)       => api.delete(`/invoices/${id}`),
  calculate:      (data)     => api.post('/invoices/calculate', data),
  previewHtml:    (data)     => api.post('/invoices/preview-html', data, { responseType: 'text' }),
  recordPayment:  (data)     => api.post('/payments', data),
};

export const notesApi = {
  list:    (params)   => api.get('/notes', { params }),
  get:     (id)       => api.get(`/notes/${id}`),
  create:  (data)     => api.post('/notes', data),
  update:  (id, data) => api.put(`/notes/${id}`, data),
  issue:   (id)       => api.patch(`/notes/${id}/issue`),
  convert: (id)       => api.post(`/notes/${id}/convert`),
  cancel:  (id)       => api.patch(`/notes/${id}/cancel`),
};

export const paymentApi = {
  list:   (params) => api.get('/payments', { params }),
  record: (data)   => api.post('/payments', data),
  delete: (id)     => api.delete(`/payments/${id}`),
};

export const reportsApi = {
  salesRegister:  (params) => api.get('/reports/sales-register', { params }),
  outstanding:    (params) => api.get('/reports/outstanding', { params }),
  hsnSummary:     (params) => api.get('/reports/hsn-summary', { params }),
  monthlyRevenue: (params) => api.get('/reports/monthly-revenue', { params }),
  gstr1:          (params) => api.get('/reports/gstr1', { params }),
  summary:        ()       => api.get('/reports/summary'),
};

// ─── Share ─────────────────────────────────────────────────────────
export const shareApi = {
  generateToken: (id, action = 'generate') => api.patch(`/invoices/${id}/share`, { action }),
};

// ─── Exports ───────────────────────────────────────────────────────
export const exportApi = {
  salesRegister: (params) => api.get('/exports/sales-register', { params, responseType: 'blob' }),
  outstanding:   (params) => api.get('/exports/outstanding',    { params, responseType: 'blob' }),
  payments:      (params) => api.get('/exports/payments',       { params, responseType: 'blob' }),
};

// ─── Email ─────────────────────────────────────────────────────────
export const emailApi = {
  send: (invoiceId, data) => api.post(`/invoices/${invoiceId}/send-email`, data),
};

// ─── Users & Team ──────────────────────────────────────────────────
export const usersApi = {
  list:       ()               => api.get('/users'),
  roles:      ()               => api.get('/users/roles'),
  invite:     (data)           => api.post('/users/invite', data),
  changeRole: (userId, role)   => api.patch(`/users/${userId}/role`, { role }),
  remove:     (userId)         => api.delete(`/users/${userId}`),
};

// ─── Audit ─────────────────────────────────────────────────────────
export const auditApi = {
  list: (params) => api.get('/audit', { params }),
};

// ─── Razorpay ──────────────────────────────────────────────────────
export const razorpayApi = {
  createLink: (invoiceId) => api.post(`/invoices/${invoiceId}/payment-link`),
  getLink:    (invoiceId) => api.get(`/invoices/${invoiceId}/payment-link`),
};
