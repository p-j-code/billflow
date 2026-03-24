const Invoice  = require('../models/Invoice');
const Business = require('../models/Business');
const Party    = require('../models/Party');
const { AppError } = require('../middleware/errorHandler');
const { determineTaxType, calcInvoiceTotals, generateInvoiceNo } = require('../utils/gstCalc');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildPartySnapshot(party) {
  const addrParts = [
    party.address?.line1, party.address?.line2,
    party.address?.city, party.address?.pincode,
  ].filter(Boolean);
  return {
    name:      party.name,
    gstin:     party.gstin || '',
    address:   addrParts.join(', '),
    state:     party.address?.state || party.stateFromGstin || '',
    stateCode: party.address?.stateCode || party.stateCodeFromGstin || '',
    mobile:    party.mobile || '',
    email:     party.email  || '',
  };
}

function getFY() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const start = m >= 4 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
// GET /api/invoices
const listInvoices = async (req, res, next) => {
  try {
    const {
      type = 'sale', status, partyId, search,
      from, to, page = 1, limit = 20,
    } = req.query;

    const query = { businessId: req.businessId };
    if (type)    query.invoiceType = type;
    if (status)  query.status      = status;
    if (partyId) query.partyId     = partyId;

    if (from || to) {
      query.invoiceDate = {};
      if (from) query.invoiceDate.$gte = new Date(from);
      if (to)   query.invoiceDate.$lte = new Date(to);
    }
    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: 'i' } },
        { 'partySnapshot.name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ invoiceDate: -1, createdAt: -1 })
        .skip(skip).limit(Number(limit))
        .select('invoiceNo invoiceType invoiceDate dueDate status partySnapshot totals amountPaid balanceDue pdfTheme createdAt'),
      Invoice.countDocuments(query),
    ]);

    // Summary stats
    const [stats] = await Invoice.aggregate([
      { $match: { businessId: req.businessId, invoiceType: type } },
      { $group: {
        _id: null,
        totalSales:   { $sum: '$totals.grandTotal' },
        totalPaid:    { $sum: '$amountPaid' },
        totalPending: { $sum: '$balanceDue' },
        count:        { $sum: 1 },
      }},
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
        stats: stats || { totalSales: 0, totalPaid: 0, totalPending: 0, count: 0 },
      },
    });
  } catch (err) { next(err); }
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────
const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId })
      .populate('partyId', 'name gstin address mobile email stateFromGstin')
      .populate('businessId', 'name gstin address bankDetails invoiceSettings logoUrl signatureUrl');
    if (!invoice) return next(new AppError('Invoice not found.', 404));
    res.json({ success: true, data: { invoice } });
  } catch (err) { next(err); }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
const createInvoice = async (req, res, next) => {
  try {
    const {
      partyId, invoiceType = 'sale', invoiceDate, dueDate, supplyDate,
      transport, vehicleNo, poNumber, refNumber, placeOfSupply,
      items = [], invoiceDiscountPct = 0,
      pdfTheme = 'traditional', notes, termsAndConditions,
      taxType: overrideTaxType,
    } = req.body;

    // Fetch business + party
    const [business, party] = await Promise.all([
      Business.findById(req.businessId),
      Party.findOne({ _id: partyId, businessId: req.businessId }),
    ]);
    if (!business) return next(new AppError('Business not found.', 404));
    if (!party)    return next(new AppError('Party not found.', 404));
    if (!items.length) return next(new AppError('At least one line item is required.', 400));

    // Determine GST type (intra vs inter)
    const bizStateCode   = business.address?.stateCode;
    const partyStateCode = party.address?.stateCode || (party.gstin ? party.gstin.substring(0, 2) : null);
    const taxType        = overrideTaxType || determineTaxType(bizStateCode, partyStateCode, party.gstin);

    // Calculate line items + totals
    const { items: calcedItems, totals } = calcInvoiceTotals(items, taxType, Number(invoiceDiscountPct));

    // Generate invoice number (increments series counter)
    const invoiceNo = generateInvoiceNo(business, invoiceType);
    await business.save();

    // Build party snapshot (frozen at invoice time)
    const partySnapshot = buildPartySnapshot(party);

    // Due date: fallback to business default credit days
    const invDate  = invoiceDate ? new Date(invoiceDate) : new Date();
    const due      = dueDate ? new Date(dueDate)
      : new Date(invDate.getTime() + (business.invoiceSettings?.defaultDueDays || 30) * 86400000);

    const invoice = await Invoice.create({
      businessId: req.businessId,
      partyId,
      invoiceNo,
      invoiceType,
      status: 'draft',
      invoiceDate:  invDate,
      dueDate:      due,
      supplyDate:   supplyDate ? new Date(supplyDate) : undefined,
      transport, vehicleNo, poNumber, refNumber, placeOfSupply,
      partySnapshot,
      taxType,
      items: calcedItems,
      totals,
      invoiceDiscountPct: Number(invoiceDiscountPct),
      invoiceDiscountAmt: totals.totalDiscount,
      amountPaid: 0,
      balanceDue: totals.grandTotal,
      pdfTheme,
      notes: notes || business.invoiceSettings?.notes,
      termsAndConditions: termsAndConditions || business.invoiceSettings?.termsAndConditions,
      financialYear: getFY(),
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Invoice created.', data: { invoice } });
  } catch (err) { next(err); }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
const updateInvoice = async (req, res, next) => {
  try {
    const existing = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!existing) return next(new AppError('Invoice not found.', 404));
    if (['cancelled', 'void'].includes(existing.status))
      return next(new AppError('Cannot edit a cancelled or void invoice.', 400));

    const { items, invoiceDiscountPct, taxType, ...rest } = req.body;

    if (items) {
      const tType = taxType || existing.taxType;
      const { items: calcedItems, totals } = calcInvoiceTotals(items, tType, Number(invoiceDiscountPct || 0));
      existing.items              = calcedItems;
      existing.totals             = totals;
      existing.taxType            = tType;
      existing.invoiceDiscountPct = Number(invoiceDiscountPct || 0);
      existing.balanceDue         = totals.grandTotal - existing.amountPaid;
    }

    Object.assign(existing, rest);
    await existing.save();

    res.json({ success: true, message: 'Invoice updated.', data: { invoice: existing } });
  } catch (err) { next(err); }
};

// ─── STATUS CHANGE (mark paid, sent, cancelled) ───────────────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const { status, amountPaid, cancelReason } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!invoice) return next(new AppError('Invoice not found.', 404));

    invoice.status = status;
    if (amountPaid !== undefined) {
      invoice.amountPaid = Number(amountPaid);
      invoice.balanceDue = invoice.totals.grandTotal - invoice.amountPaid;
      if (invoice.balanceDue <= 0) invoice.status = 'paid';
      else if (invoice.amountPaid > 0) invoice.status = 'partial';
    }
    if (status === 'cancelled') {
      invoice.cancelledAt   = new Date();
      invoice.cancelReason  = cancelReason;
    }

    await invoice.save();
    res.json({ success: true, message: `Invoice marked as ${status}.`, data: { invoice } });
  } catch (err) { next(err); }
};

// ─── RECALCULATE (live preview endpoint) ─────────────────────────────────────
// POST /api/invoices/calculate — no DB write, just returns computed totals
const calculateInvoice = async (req, res, next) => {
  try {
    const { items = [], taxType = 'intra', invoiceDiscountPct = 0 } = req.body;
    if (!items.length) return res.json({ success: true, data: { items: [], totals: {} } });

    const result = calcInvoiceTotals(items, taxType, Number(invoiceDiscountPct));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ─── DELETE (soft: void) ──────────────────────────────────────────────────────
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId, status: 'draft' },
      { status: 'void' },
      { new: true }
    );
    if (!invoice) return next(new AppError('Only draft invoices can be deleted.', 400));
    res.json({ success: true, message: 'Invoice voided.' });
  } catch (err) { next(err); }
};

module.exports = {
  listInvoices, getInvoice, createInvoice, updateInvoice,
  updateStatus, calculateInvoice, deleteInvoice,
};
