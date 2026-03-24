const express = require('express');
const router  = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { exportSalesRegister, exportOutstanding, exportPayments } = require('../controllers/exportController');

router.use(protect, requireBusiness);
router.get('/sales-register', exportSalesRegister);
router.get('/outstanding',    exportOutstanding);
router.get('/payments',       exportPayments);

module.exports = router;
