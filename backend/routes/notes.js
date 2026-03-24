const express = require('express');
const router  = express.Router();
const { protect, requireBusiness } = require('../middleware/auth');
const { listNotes, getNote, createNote, updateNote, issueNote, convertToInvoice, cancelNote } = require('../controllers/noteController');

router.use(protect, requireBusiness);
router.route('/').get(listNotes).post(createNote);
router.route('/:id').get(getNote).put(updateNote);
router.patch('/:id/issue',   issueNote);
router.post('/:id/convert',  convertToInvoice);
router.patch('/:id/cancel',  cancelNote);

module.exports = router;
