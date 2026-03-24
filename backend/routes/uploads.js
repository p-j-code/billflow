// ─── routes/uploads.js ───────────────────────────────────────────────────────
const express = require('express');
const r1 = express.Router();
const { protect } = require('../middleware/auth');
const { uploadLogo, uploadSignature } = require('../controllers/uploadController');
r1.use(protect);
r1.post('/:id/upload-logo',      uploadLogo);
r1.post('/:id/upload-signature', uploadSignature);
module.exports = r1;
