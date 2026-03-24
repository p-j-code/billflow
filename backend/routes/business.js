const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createBusiness, getMyBusinesses, getBusiness,
  updateBusiness, updateInvoiceSeries, getNextInvoiceNumber,
} = require('../controllers/businessController');

router.use(protect); // All business routes require auth

router.route('/').get(getMyBusinesses).post(createBusiness);
router.route('/:id').get(getBusiness).put(updateBusiness);
router.patch('/:id/invoice-series', updateInvoiceSeries);
router.get('/:id/next-invoice-number', getNextInvoiceNumber);

module.exports = router;
