const crypto  = require('crypto');
const Invoice  = require('../models/Invoice');
const Business = require('../models/Business');
const { traditionalTemplate } = require('../templates/traditionalTemplate');
const { modernTemplate }      = require('../templates/modernTemplate');
const { AppError } = require('../middleware/errorHandler');

// ─── Generate / Revoke share token ────────────────────────────────────────────
// PATCH /api/invoices/:id/share
const generateShareToken = async (req, res, next) => {
  try {
    const { action = 'generate' } = req.body; // generate | revoke

    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!invoice) return next(new AppError('Invoice not found.', 404));

    if (action === 'revoke') {
      invoice.shareToken     = undefined;
      invoice.shareTokenExpiry = undefined;
      await invoice.save();
      return res.json({ success: true, message: 'Share link revoked.', data: { shareToken: null } });
    }

    // Generate a random 32-char token
    const token  = crypto.randomBytes(24).toString('base64url');
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    invoice.shareToken       = token;
    invoice.shareTokenExpiry = expiry;
    await invoice.save();

    const shareUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invoice/view/${token}`;

    res.json({
      success: true,
      message: 'Share link generated.',
      data: { shareToken: token, shareUrl, expiresAt: expiry },
    });
  } catch (err) { next(err); }
};

// ─── Public: get invoice by share token (no auth required) ────────────────────
// GET /api/public/invoice/:token
const getPublicInvoice = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invoice = await Invoice.findOne({
      shareToken:        token,
      shareTokenExpiry:  { $gt: new Date() },
      status:            { $nin: ['void', 'cancelled'] },
    });

    if (!invoice) {
      return next(new AppError('Invoice not found or link has expired.', 404));
    }

    const business = await Business.findById(invoice.businessId)
      .select('name gstin address mobile email bankDetails invoiceSettings logoUrl');

    // Return sanitised data (no internal fields)
    res.json({
      success: true,
      data: {
        invoice: {
          _id:           invoice._id,
          invoiceNo:     invoice.invoiceNo,
          invoiceType:   invoice.invoiceType,
          invoiceDate:   invoice.invoiceDate,
          dueDate:       invoice.dueDate,
          status:        invoice.status,
          taxType:       invoice.taxType,
          pdfTheme:      invoice.pdfTheme,
          partySnapshot: invoice.partySnapshot,
          items:         invoice.items,
          totals:        invoice.totals,
          transport:     invoice.transport,
          notes:         invoice.notes,
          termsAndConditions: invoice.termsAndConditions,
          amountPaid:    invoice.amountPaid,
          balanceDue:    invoice.balanceDue,
        },
        business: {
          name:        business.name,
          gstin:       business.gstin,
          address:     business.address,
          mobile:      business.mobile,
          email:       business.email,
          bankDetails: business.bankDetails,
          invoiceSettings: business.invoiceSettings,
          logoUrl:     business.logoUrl,
        },
      },
    });
  } catch (err) { next(err); }
};

// ─── Public: stream PDF by share token ────────────────────────────────────────
// GET /api/public/invoice/:token/pdf
const getPublicPdf = async (req, res, next) => {
  try {
    const { token } = req.params;
    const invoice = await Invoice.findOne({ shareToken: token, shareTokenExpiry: { $gt: new Date() } });
    if (!invoice) return next(new AppError('Invalid or expired link.', 404));

    const business = await Business.findById(invoice.businessId);
    const html = invoice.pdfTheme === 'modern'
      ? modernTemplate(invoice, business)
      : traditionalTemplate(invoice, business);

    try {
      const puppeteer = require('puppeteer');
      const browser   = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      const page      = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      res.set({
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNo.replace(/\//g,'-')}.pdf"`,
      });
      return res.send(pdf);
    } catch {
      res.set('Content-Type', 'text/html');
      return res.send(html);
    }
  } catch (err) { next(err); }
};

module.exports = { generateShareToken, getPublicInvoice, getPublicPdf };
