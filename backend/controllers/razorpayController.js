const Invoice  = require('../models/Invoice');
const Payment  = require('../models/Payment');
const Business = require('../models/Business');
const { AppError } = require('../middleware/errorHandler');
const { audit }    = require('../middleware/auditMiddleware');
const crypto       = require('crypto');

function getFY() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  const s = m >= 4 ? y : y - 1;
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`;
}

// POST /api/invoices/:id/payment-link — create Razorpay payment link
const createPaymentLink = async (req, res, next) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return next(new AppError('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env', 503));
    }

    const invoice  = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!invoice)  return next(new AppError('Invoice not found.', 404));
    if (invoice.balanceDue <= 0) return next(new AppError('Invoice already fully paid.', 400));

    const business = await Business.findById(req.businessId);
    const Razorpay = require('razorpay');
    const rzp      = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

    // Create payment link
    const plink = await rzp.paymentLink.create({
      amount:       Math.round(invoice.balanceDue * 100), // in paise
      currency:     'INR',
      accept_partial: false,
      description:  `Invoice ${invoice.invoiceNo} - ${business.name}`,
      customer: {
        name:  invoice.partySnapshot?.name  || '',
        email: invoice.partySnapshot?.email || '',
        contact: invoice.partySnapshot?.mobile ? `+91${invoice.partySnapshot.mobile}` : '',
      },
      notify: {
        sms:   !!invoice.partySnapshot?.mobile,
        email: !!invoice.partySnapshot?.email,
      },
      reminder_enable: true,
      notes: {
        invoice_id:  invoice._id.toString(),
        invoice_no:  invoice.invoiceNo,
        business_id: req.businessId.toString(),
      },
      callback_url:    `${process.env.CLIENT_URL}/invoices/${invoice._id}`,
      callback_method: 'get',
    });

    // Save payment link on invoice
    invoice.razorpayPaymentLinkId  = plink.id;
    invoice.razorpayPaymentLinkUrl = plink.short_url;
    await invoice.save();

    res.json({
      success: true,
      message: 'Payment link created.',
      data: {
        paymentLinkId:  plink.id,
        paymentLinkUrl: plink.short_url,
        amount:         invoice.balanceDue,
        expiresAt:      plink.expire_by ? new Date(plink.expire_by * 1000) : null,
      },
    });
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return next(new AppError('Razorpay not installed. Run: cd backend && npm install razorpay', 503));
    }
    next(err);
  }
};

// POST /api/webhooks/razorpay — handle payment captured webhook
const razorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expected) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body;

    if (event.event === 'payment_link.paid') {
      const paymentLinkId = event.payload.payment_link.entity.id;
      const paymentEntity = event.payload.payment.entity;
      const notes         = event.payload.payment_link.entity.notes || {};

      const invoice = await Invoice.findById(notes.invoice_id);
      if (!invoice) return res.json({ success: true }); // already deleted

      const amountPaid = paymentEntity.amount / 100; // paise → rupees

      // Record payment
      await Payment.create({
        businessId:   invoice.businessId,
        invoiceId:    invoice._id,
        partyId:      invoice.partyId,
        amount:       amountPaid,
        mode:         'upi',
        paymentDate:  new Date(paymentEntity.created_at * 1000),
        reference:    paymentEntity.id,
        notes:        `Razorpay: ${paymentEntity.method} · ${paymentEntity.vpa || paymentEntity.bank || ''}`,
        invoiceNo:    invoice.invoiceNo,
        partyName:    invoice.partySnapshot?.name,
        financialYear: getFY(),
        createdBy:    invoice.createdBy,
      });

      // Update invoice
      invoice.amountPaid = (invoice.amountPaid || 0) + amountPaid;
      invoice.balanceDue = Math.max(0, invoice.totals.grandTotal - invoice.amountPaid);
      invoice.status     = invoice.balanceDue <= 0 ? 'paid' : 'partial';
      await invoice.save();

      console.log(`✅ Razorpay payment ${paymentEntity.id} recorded for invoice ${invoice.invoiceNo}`);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
};

// GET /api/invoices/:id/payment-link — get existing link status
const getPaymentLink = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId })
      .select('razorpayPaymentLinkId razorpayPaymentLinkUrl balanceDue status invoiceNo');
    if (!invoice) return next(new AppError('Invoice not found.', 404));

    res.json({
      success: true,
      data: {
        paymentLinkId:  invoice.razorpayPaymentLinkId  || null,
        paymentLinkUrl: invoice.razorpayPaymentLinkUrl || null,
        balanceDue:     invoice.balanceDue,
        status:         invoice.status,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { createPaymentLink, razorpayWebhook, getPaymentLink };
