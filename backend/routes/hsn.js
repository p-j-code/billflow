// routes/hsn.js
const express = require('express');
const router = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { searchHsn, getHsnByCode, addCustomHsn, getGstRates } = require('../controllers/hsnController');

router.use(protect);

router.get('/rates', getGstRates);
router.get('/', searchHsn);
router.get('/:code', getHsnByCode);
router.post('/', requireBusiness, addCustomHsn);

module.exports = router;
