// ─── routes/payments.js ──────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { recordPayment, listPayments, deletePayment } = require('../controllers/paymentController');

router.use(protect, requireBusiness);
router.route('/').get(listPayments).post(recordPayment);
router.delete('/:id', deletePayment);

module.exports = router;
