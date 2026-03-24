const express = require('express');
const router  = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditController');
router.use(protect, requireBusiness);
router.get('/', getAuditLogs);
module.exports = router;
