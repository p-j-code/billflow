// routes/party.js
const express = require('express');
const router = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { getParties, createParty, getParty, updateParty, deleteParty, getPartySummary } = require('../controllers/partyController');

router.use(protect, requireBusiness);

router.get('/summary', getPartySummary);
router.route('/').get(getParties).post(createParty);
router.route('/:id').get(getParty).put(updateParty).delete(deleteParty);

module.exports = router;
