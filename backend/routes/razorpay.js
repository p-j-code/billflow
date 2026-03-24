const express = require('express');
const router  = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { createPaymentLink, getPaymentLink } = require('../controllers/razorpayController');
const { razorpayWebhook } = require('../controllers/razorpayController');

// Webhook — raw body, no auth
router.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);

// Protected
router.use(protect, requireBusiness);
router.post('/invoices/:id/payment-link', createPaymentLink);
router.get('/invoices/:id/payment-link',  getPaymentLink);

module.exports = router;
