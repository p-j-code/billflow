// ─── routes/email.js ─────────────────────────────────────────────────────────
const express = require('express');
const r2 = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { sendInvoiceEmail } = require('../controllers/emailController');
r2.use(protect, requireBusiness);
r2.post('/invoices/:id/send-email', sendInvoiceEmail);
module.exports = r2;
