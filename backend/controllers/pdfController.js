const Invoice = require("../models/Invoice");
const Business = require("../models/Business");
const { AppError } = require("../middleware/errorHandler");
const { traditionalTemplate } = require("../templates/traditionalTemplate");
const { modernTemplate } = require("../templates/modernTemplate");

/**
 * Resolves the theme config object for an invoice.
 * Priority:
 *  1. Live theme from business.invoiceThemes (always wins — picks up edits and
 *     fills any fields that were missing when the invoice was first saved)
 *  2. invoice.pdfThemeConfig snapshot (fallback when the theme has since been
 *     deleted from the business)
 *  3. null — use template built-in defaults
 *
 * NOTE: We intentionally prefer the live theme over the snapshot so that
 * border/font changes made in Settings are immediately reflected.  The snapshot
 * is kept purely as a last-resort fallback for deleted themes.
 */
function resolveThemeConfig(invoice, business) {
  // 1. Live theme lookup — preferred path
  if (invoice.pdfThemeId && business?.invoiceThemes?.length) {
    const live = business.invoiceThemes.find(
      (t) => t.id === invoice.pdfThemeId,
    );
    if (live) return live;
  }
  // 2. Snapshot fallback — theme was deleted from business, use saved copy
  if (invoice.pdfThemeConfig && invoice.pdfThemeConfig.accentColor) {
    return invoice.pdfThemeConfig;
  }
  return null;
}

// GET /api/invoices/pdf/:id
const generatePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });
    if (!invoice) return next(new AppError("Invoice not found.", 404));

    const business = await Business.findById(req.businessId);
    const themeConfig = resolveThemeConfig(invoice, business);

    const html =
      invoice.pdfTheme === "modern"
        ? modernTemplate(invoice, business, themeConfig)
        : traditionalTemplate(invoice, business, themeConfig);

    try {
      const puppeteer = require("puppeteer");
      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "5mm", bottom: "5mm", left: "5mm", right: "5mm" },
      });
      await browser.close();

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNo.replace(/\//g, "-")}.pdf"`,
        "Content-Length": pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    } catch (puppeteerErr) {
      // Puppeteer not installed — stream raw HTML so the frontend can open it
      // in a new tab and the user can use Print → Save as PDF.
      console.warn(
        "Puppeteer unavailable, streaming HTML fallback:",
        puppeteerErr.message,
      );
      res.set({
        "Content-Type": "text/html; charset=utf-8",
        "X-PDF-Fallback": "true",
      });
      return res.send(html);
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices/preview-html
const previewHtml = async (req, res, next) => {
  try {
    const { invoiceData, businessId } = req.body;
    const business = await Business.findById(businessId || req.businessId);
    if (!business) return next(new AppError("Business not found.", 404));

    // Use the same resolution logic as generatePdf so the preview is always
    // consistent with the exported PDF (live theme wins over stale snapshot).
    const themeConfig = resolveThemeConfig(invoiceData, business);

    const html =
      invoiceData?.pdfTheme === "modern"
        ? modernTemplate(invoiceData, business, themeConfig)
        : traditionalTemplate(invoiceData, business, themeConfig);

    res.set("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    next(err);
  }
};

module.exports = { generatePdf, previewHtml };
