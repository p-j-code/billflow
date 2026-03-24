const express = require('express');
const router = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { getSummary } = require('../controllers/dashboardController');

router.use(protect, requireBusiness);
router.get('/summary', getSummary);

module.exports = router;
