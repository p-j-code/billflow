const Invoice  = require('../models/Invoice');
const Business = require('../models/Business');
const { AppError } = require('../middleware/errorHandler');
const { traditionalTemplate } = require('../templates/traditionalTemplate');
const { modernTemplate }      = require('../templates/modernTemplate');

/**
 * Resolves the theme config object for an invoice.
 * Priority:
 *  1. invoice.pdfThemeConfig snapshot (saved at creation, immutable)
 *  2. business.invoiceThemes lookup by pdfThemeId (live, picks up edits)
 *  3. null — use template built-in defaults
 */
function resolveThemeConfig(invoice, business) {
  if (invoice.pdfThemeConfig && invoice.pdfThemeConfig.accentColor) {
    return invoice.pdfThemeConfig;
  }
  if (invoice.pdfThemeId && business?.invoiceThemes?.length) {
    const found = business.invoiceThemes.find(t => t.id === invoice.pdfThemeId);
    if (found) return found;
  }
  return null;
}

// GET /api/invoices/pdf/:id
const generatePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!invoice) return next(new AppError('Invoice not found.', 404));

    const business    = await Business.findById(req.businessId);
    const themeConfig = resolveThemeConfig(invoice, business);

    const html = invoice.pdfTheme === 'modern'
      ? modernTemplate(invoice, business, themeConfig)
      : traditionalTemplate(invoice, business, themeConfig);

    try {
      const puppeteer = require('puppeteer');
      const browser   = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' },
      });
      await browser.close();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNo.replace(/\//g, '-')}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    } catch (puppeteerErr) {
      console.warn('Puppeteer unavailable, streaming HTML:', puppeteerErr.message);
      res.set('Content-Type', 'text/html');
      return res.send(html);
    }
  } catch (err) { next(err); }
};

// POST /api/invoices/preview-html
const previewHtml = async (req, res, next) => {
  try {
    const { invoiceData, businessId } = req.body;
    const business = await Business.findById(businessId || req.businessId);
    if (!business) return next(new AppError('Business not found.', 404));

    const themeConfig = invoiceData?.pdfThemeConfig || null;

    const html = invoiceData?.pdfTheme === 'modern'
      ? modernTemplate(invoiceData, business, themeConfig)
      : traditionalTemplate(invoiceData, business, themeConfig);

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { next(err); }
};

module.exports = { generatePdf, previewHtml };
