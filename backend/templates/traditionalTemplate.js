/**
 * Traditional Indian Tax Invoice template
 * Matches the classic format (like Hardik Embroidery Works invoice)
 * Returns HTML string — rendered by Puppeteer
 */

const { r2 } = require('../utils/gstCalc');

function fmt(n)  { return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtI(n) { return Number(n || 0).toLocaleString('en-IN'); }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
}

function traditionalTemplate(invoice, business, themeConfig = null) {
  const biz   = business;
  // ── Theme colours ──────────────────────────────────────────────────────────
  const ACCENT  = themeConfig?.accentColor || '#000000';
  const HDR_BG  = themeConfig?.headerBg    || '#000000';
  const HDR_TXT = themeConfig?.headerText  || '#ffffff';
  const FONT    = themeConfig?.fontFamily === 'serif' ? 'Georgia, serif'
                : themeConfig?.fontFamily === 'mono'  ? '"Courier New", monospace'
                : 'Arial, sans-serif';

  const party = invoice.partySnapshot;
  const items = invoice.items || [];
  const tot   = invoice.totals || {};
  const showLot = biz.invoiceSettings?.showLotBatch !== false;
  const showHsn = biz.invoiceSettings?.showHsnOnInvoice !== false;

  const docTitle = {
    sale:        'TAX INVOICE',
    purchase:    'PURCHASE INVOICE',
    credit_note: 'CREDIT NOTE',
    debit_note:  'DEBIT NOTE',
    proforma:    'PROFORMA INVOICE',
  }[invoice.invoiceType] || 'TAX INVOICE';

  const emptyRows = Math.max(0, 12 - items.length);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: ${FONT}; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 8mm; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 3px 5px; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .no-border td { border: none; }
  .header-title { text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 2px; padding: 6px 0; }
  .header-sub   { text-align: center; font-size: 12px; padding: 2px 0; }
  .header-addr  { text-align: center; font-size: 10px; padding: 2px 0; }
  .gstin-box    { text-align: center; font-size: 12px; font-weight: bold; border: 1px solid #000; padding: 4px; margin: 4px 0; }
  .label        { font-size: 9px; color: #555; }
  .value        { font-weight: 600; }
  .amt          { text-align: right; }
  .center       { text-align: center; }
  .right        { text-align: right; }
  .bold         { font-weight: bold; }
  .total-row td { background: #f9f9f9; font-weight: bold; }
  .grand-row td { background: ${HDR_BG}; color: ${HDR_TXT}; font-weight: bold; font-size: 13px; }
  .footer-sig   { border-top: 1px solid #000; padding-top: 4px; margin-top: 30px; text-align: center; font-size: 10px; }
  .items-table th { background: ${HDR_BG}; color: ${HDR_TXT}; border-color: ${HDR_BG}; font-size: 10px; padding: 4px 3px; }
  .items-table td { font-size: 10px; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div style="text-align:center; border: 2px solid #000; padding: 6px; margin-bottom: 4px;">
    <div style="font-size:9px; margin-bottom:2px;">${docTitle}</div>
    <div class="header-title">${biz.name || ''}</div>
    ${biz.legalName ? `<div class="header-sub">${biz.legalName}</div>` : ''}
    <div class="header-addr">${[biz.address?.line1, biz.address?.line2, biz.address?.city, biz.address?.state + ' - ' + biz.address?.pincode].filter(Boolean).join(', ')}</div>
    ${biz.mobile ? `<div class="header-addr">MOB: +91 ${biz.mobile}${biz.email ? ' | ' + biz.email : ''}</div>` : ''}
  </div>

  ${biz.gstin ? `<div class="gstin-box">GSTIN NO. : ${biz.gstin}</div>` : ''}

  <!-- Party + Invoice Info -->
  <table style="margin-bottom:4px;">
    <tr>
      <td width="55%" style="vertical-align:top; border-right:1px solid #000;">
        <div class="label">Name :</div>
        <div class="value" style="font-size:12px;">${party.name || ''}</div>
        ${party.address ? `<div class="label" style="margin-top:3px;">Address :</div><div>${party.address}</div>` : ''}
        ${party.state ? `<div style="margin-top:3px;"><span class="label">State : </span><span class="value">${party.state}</span><span class="label" style="margin-left:10px;">State Code : </span><span class="value">${party.stateCode || ''}</span></div>` : ''}
        ${party.gstin ? `<div style="margin-top:2px;"><span class="label">GSTIN NO. : </span><span class="value">${party.gstin}</span></div>` : ''}
      </td>
      <td width="45%" style="vertical-align:top;">
        <table style="border:none;" class="no-border">
          <tr><td style="border:none;"><span class="label">Invoice no. : </span><span class="value">${invoice.invoiceNo}</span></td></tr>
          <tr><td style="border:none;"><span class="label">Invoice date : </span><span class="value">${fmtDate(invoice.invoiceDate)}</span></td></tr>
          ${invoice.dueDate ? `<tr><td style="border:none;"><span class="label">Due date : </span>${fmtDate(invoice.dueDate)}</td></tr>` : ''}
          ${invoice.transport ? `<tr><td style="border:none;"><span class="label">Transport : </span><span class="value">${invoice.transport}</span></td></tr>` : ''}
          ${invoice.poNumber  ? `<tr><td style="border:none;"><span class="label">PO No. : </span>${invoice.poNumber}</td></tr>` : ''}
          ${invoice.vehicleNo ? `<tr><td style="border:none;"><span class="label">Vehicle No. : </span>${invoice.vehicleNo}</td></tr>` : ''}
        </table>
      </td>
    </tr>
  </table>

  <!-- Line Items Table -->
  <table class="items-table" style="margin-bottom:0;">
    <thead>
      <tr>
        <th style="width:30px;">SR.</th>
        <th>Description</th>
        ${showHsn ? '<th style="width:55px;">HSN Code</th>' : ''}
        ${showLot ? '<th style="width:45px;">LOT</th>' : ''}
        <th style="width:45px;">Qty</th>
        <th style="width:35px;">Unit</th>
        <th style="width:65px;">Rate</th>
        ${invoice.totals?.totalDiscount > 0 ? '<th style="width:55px;">Disc%</th>' : ''}
        <th style="width:75px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td class="center">${item.srNo || ''}</td>
          <td>${item.description || ''}</td>
          ${showHsn ? `<td class="center">${item.hsnCode || ''}</td>` : ''}
          ${showLot ? `<td class="center">${item.lot || ''}</td>` : ''}
          <td class="center">${fmtI(item.qty)}</td>
          <td class="center">${item.unit || 'PCS'}</td>
          <td class="right">${fmt(item.rate)}</td>
          ${invoice.totals?.totalDiscount > 0 ? `<td class="center">${item.discountPct || 0}%</td>` : ''}
          <td class="right">${fmt(item.taxableAmt)}</td>
        </tr>
      `).join('')}
      ${Array.from({length: emptyRows}).map(() => `
        <tr>
          <td>&nbsp;</td><td></td>
          ${showHsn ? '<td></td>' : ''}
          ${showLot ? '<td></td>' : ''}
          <td></td><td></td><td></td>
          ${invoice.totals?.totalDiscount > 0 ? '<td></td>' : ''}
          <td class="right">0.00</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td class="right bold" colspan="${2 + (showHsn?1:0) + (showLot?1:0) + 2}">TOTAL Ps</td>
        <td class="center bold">${fmtI(tot.totalQty)}</td>
        ${invoice.totals?.totalDiscount > 0 ? '<td></td>' : ''}
        <td class="right bold"></td>
      </tr>
    </tfoot>
  </table>

  <!-- Totals Panel -->
  <table style="margin-top:-1px;">
    <tr>
      <td rowspan="10" style="vertical-align:top; width:50%;">
        ${biz.bankDetails?.bankName ? `
        <div style="margin-bottom:8px;">
          <div class="label">Bank Details:</div>
          <div><b>${biz.bankDetails.bankName}</b></div>
          ${biz.bankDetails.accountNumber ? `<div>A/C No: ${biz.bankDetails.accountNumber}</div>` : ''}
          ${biz.bankDetails.ifsc ? `<div>IFSC: ${biz.bankDetails.ifsc}</div>` : ''}
          ${biz.bankDetails.branch ? `<div>Branch: ${biz.bankDetails.branch}</div>` : ''}
          ${biz.bankDetails.upiId ? `<div>UPI: ${biz.bankDetails.upiId}</div>` : ''}
        </div>
        ` : ''}
        ${invoice.notes ? `<div class="label">Notes:</div><div>${invoice.notes}</div>` : ''}
      </td>
      <td style="width:30%;" class="bold">TOTAL</td>
      <td class="right bold">${fmt(tot.taxableValue)}</td>
    </tr>
    <tr>
      <td>DISCOUNT %</td>
      <td class="right">${invoice.invoiceDiscountPct || 0} &nbsp;&nbsp; ${fmt(tot.totalDiscount)}</td>
    </tr>
    <tr><td class="bold">TAXABLE VALUE</td><td class="right bold">${fmt(tot.taxableValue)}</td></tr>
    ${invoice.taxType === 'intra' ? `
    <tr><td>ADD: SGST @ %</td><td class="right">${r2((tot.totalSgst / (tot.taxableValue||1))*100)} &nbsp;&nbsp; ${fmt(tot.totalSgst)}</td></tr>
    <tr><td>ADD: CGST @ %</td><td class="right">${r2((tot.totalCgst / (tot.taxableValue||1))*100)} &nbsp;&nbsp; ${fmt(tot.totalCgst)}</td></tr>
    <tr><td>ADD: IGST @ %</td><td class="right">0 &nbsp;&nbsp; 0.00</td></tr>
    ` : `
    <tr><td>ADD: SGST @ %</td><td class="right">0 &nbsp;&nbsp; 0.00</td></tr>
    <tr><td>ADD: CGST @ %</td><td class="right">0 &nbsp;&nbsp; 0.00</td></tr>
    <tr><td>ADD: IGST @ %</td><td class="right">${r2((tot.totalIgst / (tot.taxableValue||1))*100)} &nbsp;&nbsp; ${fmt(tot.totalIgst)}</td></tr>
    `}
    ${tot.roundOff ? `<tr><td>Round Off</td><td class="right">${fmt(tot.roundOff)}</td></tr>` : ''}
    <tr class="grand-row">
      <td class="bold" style="font-size:13px;">GRAND TOTAL</td>
      <td class="right bold" style="font-size:14px;">₹${fmtI(tot.grandTotal)}</td>
    </tr>
  </table>

  <!-- Amount in words -->
  <div style="border:1px solid #000; border-top:none; padding:4px 6px; font-size:10px;">
    <b>Amount in Words:</b> ${tot.grandTotalWords || ''}
  </div>

  <!-- Terms -->
  ${invoice.termsAndConditions ? `
  <div style="border:1px solid #000; border-top:none; padding:4px 6px; font-size:9px;">
    <b>Terms & Conditions:</b><br/>${invoice.termsAndConditions.replace(/\n/g,'<br/>')}
  </div>` : ''}

  <!-- Signatures -->
  <table style="margin-top:8px; border:none;">
    <tr>
      <td style="border:none; width:50%; text-align:center; padding-top:30px;">
        <div style="border-top:1px solid #000; display:inline-block; width:80%; padding-top:4px; font-size:10px;">authorised signature</div>
      </td>
      <td style="border:none; width:50%; text-align:center; padding-top:30px;">
        <div style="border-top:1px solid #000; display:inline-block; width:80%; padding-top:4px; font-size:10px; font-weight:bold;">FOR: ${biz.name || ''}<br/><span style="font-weight:normal;">authorised signature</span></div>
      </td>
    </tr>
  </table>

  <div style="text-align:center; font-size:9px; color:#555; margin-top:8px; border-top:1px dashed #aaa; padding-top:4px;">
    certified that the particulars given above are true correct and the amount indicated represents the price actually charged<br/>
    computer generated invoice
  </div>
</div>
</body>
</html>`;
}

module.exports = { traditionalTemplate };
