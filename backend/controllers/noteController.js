const Note     = require('../models/Note');
const Invoice  = require('../models/Invoice');
const Business = require('../models/Business');
const Party    = require('../models/Party');
const { AppError }   = require('../middleware/errorHandler');
const { calcInvoiceTotals, generateInvoiceNo, determineTaxType } = require('../utils/gstCalc');

function getFY() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  const s = m >= 4 ? y : y - 1;
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`;
}

function buildPartySnapshot(party) {
  return {
    name:      party.name,
    gstin:     party.gstin || '',
    address:   [party.address?.line1, party.address?.line2, party.address?.city, party.address?.pincode].filter(Boolean).join(', '),
    state:     party.address?.state || '',
    stateCode: party.address?.stateCode || (party.gstin ? party.gstin.slice(0, 2) : ''),
    mobile:    party.mobile || '',
  };
}

// Note type → series type mapping
const SERIES_MAP = { credit_note: 'credit_note', debit_note: 'debit_note', proforma: 'proforma' };

// ─── LIST ─────────────────────────────────────────────────────────────────────
const listNotes = async (req, res, next) => {
  try {
    const { noteType, status, partyId, search, page = 1, limit = 20 } = req.query;
    const query = { businessId: req.businessId };
    if (noteType) query.noteType = noteType;
    if (status)   query.status   = status;
    if (partyId)  query.partyId  = partyId;
    if (search) {
      query.$or = [
        { noteNo: { $regex: search, $options: 'i' } },
        { 'partySnapshot.name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [notes, total] = await Promise.all([
      Note.find(query).sort({ noteDate: -1 }).skip(skip).limit(Number(limit))
        .select('noteNo noteType status noteDate partySnapshot totals reason convertedToInvoiceId'),
      Note.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { notes, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } },
    });
  } catch (err) { next(err); }
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────
const getNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, businessId: req.businessId })
      .populate('originalInvoiceId', 'invoiceNo invoiceDate totals')
      .populate('convertedToInvoiceId', 'invoiceNo');
    if (!note) return next(new AppError('Document not found.', 404));
    res.json({ success: true, data: { note } });
  } catch (err) { next(err); }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
const createNote = async (req, res, next) => {
  try {
    const {
      partyId, noteType, noteDate, validUntil,
      originalInvoiceId, originalInvoiceNo,
      reason, reasonDescription,
      items = [], taxType: overrideTaxType,
      pdfTheme = 'traditional', notes, termsAndConditions,
    } = req.body;

    if (!['credit_note', 'debit_note', 'proforma'].includes(noteType))
      return next(new AppError('Invalid noteType.', 400));
    if (!items.length) return next(new AppError('At least one line item is required.', 400));

    const [business, party] = await Promise.all([
      Business.findById(req.businessId),
      Party.findOne({ _id: partyId, businessId: req.businessId }),
    ]);
    if (!business) return next(new AppError('Business not found.', 404));
    if (!party)    return next(new AppError('Party not found.', 404));

    // Tax type detection
    const bizCode   = business.address?.stateCode;
    const partyCode = party.address?.stateCode || (party.gstin ? party.gstin.slice(0, 2) : null);
    const taxType   = noteType === 'proforma' ? 'exempt'
      : (overrideTaxType || determineTaxType(bizCode, partyCode, party.gstin));

    const effectiveTaxType = taxType === 'exempt' ? 'intra' : taxType;
    const { items: calcedItems, totals } = calcInvoiceTotals(items, effectiveTaxType);

    // Zero out tax for proforma
    if (taxType === 'exempt') {
      totals.totalCgst = 0; totals.totalSgst = 0; totals.totalIgst = 0;
      totals.totalTax  = 0;
      totals.grandTotal = totals.taxableValue;
      calcedItems.forEach(i => { i.cgstAmt = 0; i.sgstAmt = 0; i.igstAmt = 0; i.totalAmt = i.taxableAmt; });
    }

    // Generate note number
    const noteNo = generateInvoiceNo(business, SERIES_MAP[noteType]);
    await business.save();

    const note = await Note.create({
      businessId: req.businessId,
      partyId,
      noteType, noteNo, status: 'draft',
      noteDate: noteDate ? new Date(noteDate) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      originalInvoiceId: originalInvoiceId || null,
      originalInvoiceNo: originalInvoiceNo || '',
      reason: reason || 'other', reasonDescription,
      partySnapshot: buildPartySnapshot(party),
      taxType,
      items: calcedItems,
      totals,
      pdfTheme, notes, termsAndConditions,
      financialYear: getFY(),
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: `${noteType.replace('_', ' ')} created.`, data: { note } });
  } catch (err) { next(err); }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
const updateNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!note) return next(new AppError('Document not found.', 404));
    if (note.status === 'converted') return next(new AppError('Cannot edit a converted document.', 400));

    const { items, taxType, ...rest } = req.body;
    if (items) {
      const tType = taxType || note.taxType;
      const effectiveTaxType = tType === 'exempt' ? 'intra' : tType;
      const { items: calcedItems, totals } = calcInvoiceTotals(items, effectiveTaxType);
      if (tType === 'exempt') {
        totals.totalCgst = 0; totals.totalSgst = 0; totals.totalIgst = 0;
        totals.totalTax  = 0; totals.grandTotal = totals.taxableValue;
      }
      note.items = calcedItems;
      note.totals = totals;
      note.taxType = tType;
    }
    Object.assign(note, rest);
    await note.save();
    res.json({ success: true, message: 'Document updated.', data: { note } });
  } catch (err) { next(err); }
};

// ─── ISSUE (draft → issued) ───────────────────────────────────────────────────
const issueNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId, status: 'draft' },
      { status: 'issued' },
      { new: true }
    );
    if (!note) return next(new AppError('Document not found or already issued.', 404));
    res.json({ success: true, message: 'Document issued.', data: { note } });
  } catch (err) { next(err); }
};

// ─── CONVERT PROFORMA → TAX INVOICE ──────────────────────────────────────────
const convertToInvoice = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, businessId: req.businessId, noteType: 'proforma' });
    if (!note)                     return next(new AppError('Proforma not found.', 404));
    if (note.status === 'converted') return next(new AppError('Already converted to invoice.', 400));

    const business = await Business.findById(req.businessId);
    const taxType  = note.taxType === 'exempt' ? 'intra' : note.taxType;

    // Recalculate with actual GST
    const { items: calcedItems, totals } = calcInvoiceTotals(note.items, taxType);
    const invoiceNo = generateInvoiceNo(business, 'sale');
    await business.save();

    const invoice = await Invoice.create({
      businessId:     req.businessId,
      partyId:        note.partyId,
      invoiceNo,
      invoiceType:    'sale',
      status:         'draft',
      invoiceDate:    new Date(),
      dueDate:        new Date(Date.now() + 30 * 86400000),
      partySnapshot:  note.partySnapshot,
      taxType,
      items:          calcedItems,
      totals,
      amountPaid:     0,
      balanceDue:     totals.grandTotal,
      pdfTheme:       note.pdfTheme,
      notes:          note.notes,
      termsAndConditions: note.termsAndConditions,
      financialYear:  getFY(),
      createdBy:      req.user._id,
    });

    // Mark proforma as converted
    note.status = 'converted';
    note.convertedToInvoiceId = invoice._id;
    note.convertedAt = new Date();
    await note.save();

    res.status(201).json({
      success: true,
      message: `Proforma converted to Invoice ${invoiceNo}.`,
      data: { invoice, note },
    });
  } catch (err) { next(err); }
};

// ─── CANCEL ───────────────────────────────────────────────────────────────────
const cancelNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId, status: { $ne: 'converted' } },
      { status: 'cancelled' },
      { new: true }
    );
    if (!note) return next(new AppError('Document not found or cannot be cancelled.', 404));
    res.json({ success: true, message: 'Document cancelled.', data: { note } });
  } catch (err) { next(err); }
};

module.exports = { listNotes, getNote, createNote, updateNote, issueNote, convertToInvoice, cancelNote };
