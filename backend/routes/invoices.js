const express = require('express');
const router  = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const {
  listInvoices, getInvoice, createInvoice, updateInvoice,
  updateStatus, calculateInvoice, deleteInvoice,
} = require('../controllers/invoiceController');
const { generatePdf, previewHtml } = require('../controllers/pdfController');

router.use(protect, requireBusiness);

router.post('/calculate',    calculateInvoice);
router.post('/preview-html', previewHtml);
router.get('/pdf/:id',       generatePdf);

router.route('/')
  .get(listInvoices)
  .post(createInvoice);

router.route('/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(deleteInvoice);

router.patch('/:id/status', updateStatus);

module.exports = router;
// Share token
const { generateShareToken } = require('../controllers/shareController');
router.patch('/:id/share', generateShareToken);
