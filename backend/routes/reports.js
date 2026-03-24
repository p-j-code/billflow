const express = require('express');
const router  = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { salesRegister, partyOutstanding, hsnSummary, monthlyRevenue, gstr1Export, fullSummary } = require('../controllers/reportsController');

router.use(protect, requireBusiness);
router.get('/sales-register',  salesRegister);
router.get('/outstanding',     partyOutstanding);
router.get('/hsn-summary',     hsnSummary);
router.get('/monthly-revenue', monthlyRevenue);
router.get('/gstr1',           gstr1Export);
router.get('/summary',         fullSummary);

module.exports = router;
