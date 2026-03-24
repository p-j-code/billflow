// ════════════════════════════════════════════════════════════════════
// PHASE 2 INTEGRATION GUIDE
// Files to ADD or MODIFY in your existing codebase
// ════════════════════════════════════════════════════════════════════

// ─── 1. backend/server.js ─────────────────────────────────────────
// Add after existing routes:
//
//   const invoiceRoutes = require('./routes/invoices');
//   app.use('/api/invoices', invoiceRoutes);
//
// Also add to pdfController route in invoices.js:
//   const { previewHtml } = require('../controllers/pdfController');
//   router.post('/preview-html', previewHtml);

// ─── 2. frontend/src/store/index.js ───────────────────────────────
// Add invoiceReducer:
//
//   import invoiceReducer from './slices/invoiceSlice';
//   // add to reducer map:
//   invoice: invoiceReducer,

// ─── 3. frontend/src/api/index.js ─────────────────────────────────
// Add invoiceApi export (copy from invoiceApi.js):
//
//   export const invoiceApi = {
//     list:         (params) => api.get('/invoices', { params }),
//     get:          (id)     => api.get(`/invoices/${id}`),
//     create:       (data)   => api.post('/invoices', data),
//     update:      (id, d)   => api.put(`/invoices/${id}`, d),
//     updateStatus:(id, d)   => api.patch(`/invoices/${id}/status`, d),
//     delete:       (id)     => api.delete(`/invoices/${id}`),
//     calculate:    (data)   => api.post('/invoices/calculate', data),
//     previewHtml:  (data)   => api.post('/invoices/preview-html', data, { responseType: 'text' }),
//   };

// ─── 4. frontend/src/App.jsx ──────────────────────────────────────
// Add invoice routes:
//
//   import InvoiceListPage   from '@/pages/invoices/InvoiceListPage';
//   import InvoiceCreatePage from '@/pages/invoices/InvoiceCreatePage';
//
//   // Inside <Route path="/" element={<RequireAuth>...}>:
//   <Route path="invoices"     element={<InvoiceListPage />} />
//   <Route path="invoices/new" element={<InvoiceCreatePage />} />

// ─── 5. frontend/src/components/layout/Sidebar.jsx ────────────────
// The Invoices nav item already exists with soon:true — remove soon:true:
//
//   { to: '/invoices', icon: Receipt, label: 'Invoices' },  // remove soon: true

// ─── 6. Install puppeteer (optional, for actual PDF) ──────────────
// cd backend && npm install puppeteer
// Without puppeteer, /api/invoices/pdf/:id streams HTML instead of PDF
// All preview functionality works without puppeteer via the iframe approach

// ─── 7. NEW files to copy into your project ───────────────────────
// backend/models/Invoice.js               → backend/models/
// backend/utils/gstCalc.js                → backend/utils/
// backend/controllers/invoiceController.js→ backend/controllers/
// backend/controllers/pdfController.js    → backend/controllers/
// backend/routes/invoices.js              → backend/routes/
// backend/templates/traditionalTemplate.js→ backend/templates/
// backend/templates/modernTemplate.js     → backend/templates/
//
// frontend/src/store/slices/invoiceSlice.js  → store/slices/
// frontend/src/hooks/useGstCalc.js           → src/hooks/
// frontend/src/api/invoiceApi.js             → merge into src/api/index.js
// frontend/src/components/invoice/InvoicePreview.jsx → components/invoice/
// frontend/src/pages/invoices/InvoiceListPage.jsx    → pages/invoices/
// frontend/src/pages/invoices/InvoiceCreatePage.jsx  → pages/invoices/
