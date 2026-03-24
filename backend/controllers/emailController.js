const Invoice  = require('../models/Invoice');
const Business = require('../models/Business');
const { AppError } = require('../middleware/errorHandler');
const { audit }    = require('../middleware/auditMiddleware');
const { traditionalTemplate } = require('../templates/traditionalTemplate');
const { modernTemplate }      = require('../templates/modernTemplate');

// Build email HTML
function buildEmailHtml(invoice, business, shareUrl) {
  const biz   = business;
  const party = invoice.partySnapshot || {};
  const total = Number(invoice.totals?.grandTotal || 0).toLocaleString('en-IN');
  const fmtD  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1);">
    <!-- Header -->
    <div style="background:#0B0D12;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:32px;height:32px;background:#F59E0B;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#0B0D12;">₹</div>
          <span style="font-size:18px;font-weight:800;color:#fff;">${biz.name || 'Your Business'}</span>
        </div>
        <p style="margin:0;font-size:12px;color:#6B7280;">${biz.gstin ? 'GSTIN: ' + biz.gstin : ''}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Invoice</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#F59E0B;font-family:monospace;">${invoice.invoiceNo}</p>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="font-size:16px;color:#111827;margin:0 0 8px;">Dear <strong>${party.name || 'Valued Customer'}</strong>,</p>
      <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">Please find your invoice for the following:</p>

      <!-- Amount card -->
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Amount Due</p>
            <p style="margin:0;font-size:28px;font-weight:900;color:#111827;">₹${total}</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">Invoice Date</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#374151;">${fmtD(invoice.invoiceDate)}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#9CA3AF;">Due Date</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:${invoice.balanceDue > 0 && new Date(invoice.dueDate) < new Date() ? '#EF4444' : '#374151'};">${fmtD(invoice.dueDate)}</p>
          </div>
        </div>

        ${invoice.balanceDue < invoice.totals?.grandTotal ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:13px;">
          <span style="color:#6B7280;">Already Paid</span>
          <span style="color:#10B981;font-weight:700;">₹${Number(invoice.amountPaid||0).toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px;">
          <span style="color:#6B7280;">Balance Due</span>
          <span style="color:#EF4444;font-weight:700;">₹${Number(invoice.balanceDue||0).toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
      </div>

      ${shareUrl ? `
      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${shareUrl}" style="display:inline-block;background:#F59E0B;color:#0B0D12;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;">
          View &amp; Download Invoice
        </a>
        <p style="font-size:12px;color:#9CA3AF;margin:10px 0 0;">Or copy this link: <a href="${shareUrl}" style="color:#F59E0B;">${shareUrl}</a></p>
      </div>
      ` : ''}

      <!-- Bank details -->
      ${biz.bankDetails?.bankName ? `
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:1px;">Payment Details</p>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          ${[
            ['Bank', biz.bankDetails.bankName],
            ['Account No.', biz.bankDetails.accountNumber],
            ['IFSC', biz.bankDetails.ifsc],
            ['Branch', biz.bankDetails.branch],
            ['UPI', biz.bankDetails.upiId],
          ].filter(([,v]) => v).map(([k,v]) => `
          <tr>
            <td style="padding:3px 0;color:#6B7280;width:40%">${k}</td>
            <td style="padding:3px 0;color:#111827;font-weight:600;">${v}</td>
          </tr>`).join('')}
        </table>
      </div>
      ` : ''}

      <p style="color:#6B7280;font-size:14px;margin:0;">Thank you for your business. Please contact us if you have any questions.</p>

      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #F3F4F6;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#111827;">${biz.name}</p>
        ${biz.mobile ? `<p style="margin:4px 0 0;font-size:12px;color:#6B7280;">📞 ${biz.mobile}</p>` : ''}
        ${biz.email  ? `<p style="margin:4px 0 0;font-size:12px;color:#6B7280;">✉ ${biz.email}</p>`  : ''}
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F9FAFB;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9CA3AF;">Powered by <strong>BillFlow</strong> · This is a computer generated invoice</p>
    </div>
  </div>
</body>
</html>`;
}

// POST /api/invoices/:id/send-email
const sendInvoiceEmail = async (req, res, next) => {
  try {
    const { to, cc, subject, message, includeShareLink = true } = req.body;

    if (!to) return next(new AppError('Recipient email (to) is required.', 400));

    const invoice  = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!invoice)  return next(new AppError('Invoice not found.', 404));

    const business = await Business.findById(req.businessId);

    // Build share URL if token exists
    let shareUrl = null;
    if (includeShareLink && invoice.shareToken) {
      shareUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invoice/view/${invoice.shareToken}`;
    }

    const html    = buildEmailHtml(invoice, business, shareUrl);
    const emailSubject = subject || `Invoice ${invoice.invoiceNo} from ${business.name}`;
    const total   = Number(invoice.totals?.grandTotal || 0).toLocaleString('en-IN');

    // ── Try Resend (primary) ──────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from:    process.env.EMAIL_FROM || `${business.name} <invoices@billflow.in>`,
        to:      Array.isArray(to) ? to : [to],
        cc:      cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        subject: emailSubject,
        html,
        text: `Invoice ${invoice.invoiceNo} from ${business.name}. Amount: ₹${total}. ${shareUrl ? 'View: ' + shareUrl : ''}`,
      });

    // ── Try Nodemailer (fallback) ─────────────────────────────────────
    } else if (process.env.SMTP_HOST) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT)  || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from:    `"${business.name}" <${process.env.SMTP_USER}>`,
        to,
        cc,
        subject: emailSubject,
        html,
        text: `Invoice ${invoice.invoiceNo} from ${business.name}. Amount: ₹${total}.`,
      });

    } else {
      return next(new AppError(
        'Email not configured. Set RESEND_API_KEY or SMTP_HOST in .env to enable email sending.',
        503
      ));
    }

    // Update invoice status to 'sent' if it was draft
    if (invoice.status === 'draft') {
      invoice.status = 'sent';
      await invoice.save();
    }

    await audit(req, 'invoice.status_changed', 'invoice', invoice._id,
      `Invoice ${invoice.invoiceNo}`, { after: { emailedTo: to, status: invoice.status } });

    res.json({
      success: true,
      message: `Invoice emailed to ${Array.isArray(to) ? to.join(', ') : to}`,
      data: { emailedTo: to, invoiceStatus: invoice.status },
    });
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return next(new AppError('Email provider not installed. Run: npm install resend', 503));
    }
    next(err);
  }
};

module.exports = { sendInvoiceEmail };
