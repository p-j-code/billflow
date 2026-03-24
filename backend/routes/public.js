// ─── routes/public.js ─────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { getPublicInvoice, getPublicPdf } = require('../controllers/shareController');

// No auth — publicly accessible by share token
router.get('/invoice/:token',     getPublicInvoice);
router.get('/invoice/:token/pdf', getPublicPdf);

module.exports = router;
