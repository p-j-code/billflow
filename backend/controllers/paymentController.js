const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const { AppError } = require('../middleware/errorHandler');

function getFY() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  const s = m >= 4 ? y : y - 1;
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`;
}

// POST /api/payments — record a payment against an invoice
const recordPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, mode, paymentDate, reference, bankName, notes } = req.body;

    if (!invoiceId) return next(new AppError('invoiceId is required.', 400));
    if (!amount || amount <= 0) return next(new AppError('Amount must be greater than 0.', 400));

    const invoice = await Invoice.findOne({ _id: invoiceId, businessId: req.businessId });
    if (!invoice) return next(new AppError('Invoice not found.', 404));
    if (['cancelled', 'void'].includes(invoice.status))
      return next(new AppError('Cannot record payment on a cancelled invoice.', 400));

    const payment = await Payment.create({
      businessId:  req.businessId,
      invoiceId,
      partyId:     invoice.partyId,
      amount:      Number(amount),
      mode:        mode || 'cash',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      reference, bankName, notes,
      invoiceNo:   invoice.invoiceNo,
      partyName:   invoice.partySnapshot?.name,
      financialYear: getFY(),
      createdBy:   req.user._id,
    });

    // Update invoice amountPaid + balanceDue + status
    invoice.amountPaid = Number((invoice.amountPaid || 0)) + Number(amount);
    invoice.balanceDue = Math.max(0, invoice.totals.grandTotal - invoice.amountPaid);

    if (invoice.balanceDue <= 0) invoice.status = 'paid';
    else if (invoice.amountPaid > 0) invoice.status = 'partial';

    await invoice.save();

    res.status(201).json({
      success: true,
      message: 'Payment recorded.',
      data: { payment, invoice: { status: invoice.status, amountPaid: invoice.amountPaid, balanceDue: invoice.balanceDue } },
    });
  } catch (err) { next(err); }
};

// GET /api/payments — list payments with filters
const listPayments = async (req, res, next) => {
  try {
    const { invoiceId, partyId, mode, from, to, page = 1, limit = 20 } = req.query;

    const query = { businessId: req.businessId };
    if (invoiceId) query.invoiceId = invoiceId;
    if (partyId)   query.partyId   = partyId;
    if (mode)      query.mode       = mode;
    if (from || to) {
      query.paymentDate = {};
      if (from) query.paymentDate.$gte = new Date(from);
      if (to)   query.paymentDate.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(query).sort({ paymentDate: -1 }).skip(skip).limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    // Summary
    const [summary] = await Payment.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
        summary: summary || { total: 0, count: 0 },
      },
    });
  } catch (err) { next(err); }
};

// DELETE /api/payments/:id — reverse a payment
const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!payment) return next(new AppError('Payment not found.', 404));

    // Reverse on invoice
    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - payment.amount);
      invoice.balanceDue = invoice.totals.grandTotal - invoice.amountPaid;
      invoice.status = invoice.amountPaid <= 0 ? 'sent' : 'partial';
      await invoice.save();
    }

    await payment.deleteOne();
    res.json({ success: true, message: 'Payment reversed.' });
  } catch (err) { next(err); }
};

module.exports = { recordPayment, listPayments, deletePayment };
