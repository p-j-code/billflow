const Invoice  = require('../models/Invoice');
const Business = require('../models/Business');
const { AppError } = require('../middleware/errorHandler');
const { traditionalTemplate } = require('../templates/traditionalTemplate');
const { modernTemplate }      = require('../templates/modernTemplate');

// GET /api/invoices/pdf/:id
const generatePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!invoice) return next(new AppError('Invoice not found.', 404));

    const business = await Business.findById(req.businessId);

    const html = invoice.pdfTheme === 'modern'
      ? modernTemplate(invoice, business)
      : traditionalTemplate(invoice, business);

    // Try Puppeteer (production), fall back to HTML stream (dev without Puppeteer)
    try {
      const puppeteer = require('puppeteer');
      const browser   = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page      = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top:'5mm', bottom:'5mm', left:'5mm', right:'5mm' } });
      await browser.close();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNo.replace(/\//g,'-')}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    } catch (puppeteerErr) {
      // Puppeteer not installed — stream HTML for preview
      console.warn('Puppeteer unavailable, streaming HTML:', puppeteerErr.message);
      res.set('Content-Type', 'text/html');
      return res.send(html);
    }
  } catch (err) { next(err); }
};

// POST /api/invoices/preview-html — Returns HTML for frontend iframe preview
const previewHtml = async (req, res, next) => {
  try {
    const { invoiceData, businessId } = req.body;
    const business = await Business.findById(businessId || req.businessId);
    if (!business) return next(new AppError('Business not found.', 404));

    const html = invoiceData?.pdfTheme === 'modern'
      ? modernTemplate(invoiceData, business)
      : traditionalTemplate(invoiceData, business);

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { next(err); }
};

module.exports = { generatePdf, previewHtml };
