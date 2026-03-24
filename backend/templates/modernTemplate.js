/**
 * Modern clean invoice template
 * Premium card-based layout with color-coded tax breakdown
 */
const { r2 } = require('../utils/gstCalc');

function fmt(n)  { return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtI(n) { return Number(n || 0).toLocaleString('en-IN'); }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function modernTemplate(invoice, business) {
  const biz   = business;
  const party = invoice.partySnapshot;
  const items = invoice.items || [];
  const tot   = invoice.totals || {};
  const showLot = biz.invoiceSettings?.showLotBatch !== false;
  const showHsn = biz.invoiceSettings?.showHsnOnInvoice !== false;

  const STATUS_COLOR = {
    draft: '#6B7280', sent: '#3B82F6', paid: '#10B981',
    partial: '#F59E0B', overdue: '#EF4444', cancelled: '#9CA3AF',
  };
  const statusColor = STATUS_COLOR[invoice.status] || '#6B7280';

  const docTitle = {
    sale: 'TAX INVOICE', purchase: 'PURCHASE INVOICE',
    credit_note: 'CREDIT NOTE', debit_note: 'DEBIT NOTE', proforma: 'PROFORMA INVOICE',
  }[invoice.invoiceType] || 'TAX INVOICE';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1F2937; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 10mm 12mm; }

  /* Header */
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; padding-bottom:20px; border-bottom: 3px solid #F59E0B; }
  .biz-name { font-size:22px; font-weight:800; color:#111827; letter-spacing:-0.5px; }
  .biz-sub  { font-size:11px; color:#6B7280; margin-top:3px; }
  .biz-gstin { display:inline-block; margin-top:6px; background:#FEF3C7; border:1px solid #F59E0B; border-radius:4px; padding:2px 8px; font-size:10px; font-weight:700; color:#92400E; }
  .invoice-badge { text-align:right; }
  .invoice-type { font-size:13px; font-weight:700; color:#F59E0B; text-transform:uppercase; letter-spacing:1px; }
  .invoice-no  { font-size:24px; font-weight:800; color:#111827; }
  .status-pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; color:#fff; background:${statusColor}; margin-top:4px; }

  /* Party + Date Grid */
  .info-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px; margin-bottom:20px; }
  .info-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px 12px; }
  .info-label { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#9CA3AF; font-weight:700; margin-bottom:4px; }
  .info-value { font-size:12px; font-weight:600; color:#111827; }
  .info-sub   { font-size:10px; color:#6B7280; margin-top:2px; }

  /* Items Table */
  .items-section { margin-bottom:16px; }
  .items-table { width:100%; border-collapse:collapse; }
  .items-table thead tr { background:#111827; color:#fff; }
  .items-table th { padding:7px 8px; font-size:10px; font-weight:700; text-align:left; }
  .items-table th.right { text-align:right; }
  .items-table th.center { text-align:center; }
  .items-table tbody tr { border-bottom:1px solid #F3F4F6; }
  .items-table tbody tr:nth-child(even) { background:#FAFAFA; }
  .items-table td { padding:6px 8px; font-size:11px; }
  .items-table td.right  { text-align:right; }
  .items-table td.center { text-align:center; }
  .hsn-tag { display:inline-block; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:3px; padding:1px 5px; font-size:9px; color:#1D4ED8; font-weight:700; }
  .lot-tag { display:inline-block; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:3px; padding:1px 5px; font-size:9px; color:#15803D; }

  /* Totals */
  .bottom-section { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .bank-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px; }
  .bank-title { font-size:10px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  .bank-row { display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px; }
  .bank-key { color:#6B7280; }
  .bank-val { font-weight:600; color:#111827; }

  .totals-card { }
  .totals-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #F3F4F6; font-size:11px; }
  .totals-row.taxable { background:#FEF3C7; padding:6px 8px; border-radius:4px; font-weight:700; margin:4px 0; border:none; }
  .totals-row.grand { background:#111827; color:#fff; padding:10px 12px; border-radius:8px; margin-top:8px; font-size:14px; font-weight:800; border:none; }
  .totals-row.grand .t-label { color:#F59E0B; }
  .tax-pills { display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
  .tax-pill { flex:1; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:6px; padding:6px 8px; text-align:center; }
  .tax-pill.igst { background:#FFF7ED; border-color:#FED7AA; }
  .tax-pill-label { font-size:9px; color:#6B7280; font-weight:700; text-transform:uppercase; }
  .tax-pill-val   { font-size:13px; font-weight:800; color:#1D4ED8; }
  .tax-pill.igst .tax-pill-val { color:#C2410C; }

  /* Words */
  .words-box { background:#ECFDF5; border:1px solid #A7F3D0; border-radius:6px; padding:8px 10px; margin-top:12px; font-size:10px; color:#065F46; font-weight:600; }

  /* Footer */
  .footer { margin-top:20px; padding-top:16px; border-top:2px solid #E5E7EB; display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .sig-block { text-align:center; }
  .sig-line { border-top:1px solid #9CA3AF; margin-top:28px; padding-top:6px; font-size:10px; color:#6B7280; }
  .footer-note { text-align:center; font-size:9px; color:#9CA3AF; margin-top:12px; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="biz-name">${biz.name || ''}</div>
      ${biz.legalName ? `<div class="biz-sub">${biz.legalName}</div>` : ''}
      <div class="biz-sub">${[biz.address?.line1, biz.address?.city, biz.address?.state].filter(Boolean).join(', ')}</div>
      ${biz.mobile ? `<div class="biz-sub">📞 +91 ${biz.mobile}${biz.email ? ' · ' + biz.email : ''}</div>` : ''}
      ${biz.gstin ? `<div><span class="biz-gstin">GSTIN: ${biz.gstin}</span></div>` : ''}
    </div>
    <div class="invoice-badge">
      <div class="invoice-type">${docTitle}</div>
      <div class="invoice-no">#${invoice.invoiceNo}</div>
      <div><span class="status-pill">${(invoice.status || 'draft').toUpperCase()}</span></div>
    </div>
  </div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-card" style="grid-column:span 1;">
      <div class="info-label">Bill To</div>
      <div class="info-value">${party.name || ''}</div>
      ${party.address ? `<div class="info-sub">${party.address}</div>` : ''}
      ${party.state ? `<div class="info-sub">${party.state}${party.stateCode ? ' · ' + party.stateCode : ''}</div>` : ''}
      ${party.gstin ? `<div class="info-sub" style="font-weight:700;color:#374151;">GST: ${party.gstin}</div>` : ''}
      ${party.mobile ? `<div class="info-sub">📞 ${party.mobile}</div>` : ''}
    </div>
    <div class="info-card">
      <div class="info-label">Invoice Date</div>
      <div class="info-value">${fmtDate(invoice.invoiceDate)}</div>
      ${invoice.dueDate ? `<div class="info-label" style="margin-top:8px;">Due Date</div><div class="info-value">${fmtDate(invoice.dueDate)}</div>` : ''}
      ${invoice.supplyDate ? `<div class="info-label" style="margin-top:8px;">Supply Date</div><div class="info-value">${fmtDate(invoice.supplyDate)}</div>` : ''}
    </div>
    <div class="info-card">
      ${invoice.transport ? `<div class="info-label">Transport</div><div class="info-value">${invoice.transport}</div>` : ''}
      ${invoice.poNumber  ? `<div class="info-label" style="margin-top:6px;">PO Number</div><div class="info-value">${invoice.poNumber}</div>` : ''}
      ${invoice.vehicleNo ? `<div class="info-label" style="margin-top:6px;">Vehicle No.</div><div class="info-value">${invoice.vehicleNo}</div>` : ''}
      <div class="info-label" style="margin-top:6px;">Tax Type</div>
      <div class="info-value" style="color:${invoice.taxType==='intra'?'#059669':'#D97706'};">${invoice.taxType === 'intra' ? 'Intra-State (SGST + CGST)' : 'Inter-State (IGST)'}</div>
    </div>
  </div>

  <!-- Line Items -->
  <div class="items-section">
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:28px;">#</th>
          <th>Description</th>
          ${showHsn ? '<th style="width:65px;" class="center">HSN/SAC</th>' : ''}
          ${showLot ? '<th style="width:55px;" class="center">LOT/Batch</th>' : ''}
          <th style="width:40px;" class="center">Qty</th>
          <th style="width:35px;" class="center">Unit</th>
          <th style="width:65px;" class="right">Rate</th>
          <th style="width:45px;" class="center">Disc%</th>
          <th style="width:50px;" class="center">Tax%</th>
          <th style="width:75px;" class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td class="center" style="color:#9CA3AF;">${item.srNo}</td>
            <td><b>${item.description || ''}</b></td>
            ${showHsn ? `<td class="center">${item.hsnCode ? `<span class="hsn-tag">${item.hsnCode}</span>` : '—'}</td>` : ''}
            ${showLot ? `<td class="center">${item.lot ? `<span class="lot-tag">${item.lot}</span>` : '—'}</td>` : ''}
            <td class="center"><b>${fmtI(item.qty)}</b></td>
            <td class="center" style="color:#6B7280;">${item.unit || 'PCS'}</td>
            <td class="right">₹${fmt(item.rate)}</td>
            <td class="center">${item.discountPct ? item.discountPct + '%' : '—'}</td>
            <td class="center">${item.taxablePct ? item.taxablePct + '%' : '—'}</td>
            <td class="right"><b>₹${fmt(item.taxableAmt)}</b></td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="background:#F3F4F6; font-weight:700;">
          <td colspan="${3 + (showHsn?1:0) + (showLot?1:0)}" class="right" style="color:#6B7280; font-size:10px;">TOTAL QTY: ${fmtI(tot.totalQty)}</td>
          <td colspan="4" class="right" style="font-size:12px;">₹${fmt(tot.taxableValue)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Bottom: Bank + Totals -->
  <div class="bottom-section">
    <!-- Bank + Notes -->
    <div>
      ${biz.bankDetails?.bankName ? `
      <div class="bank-card" style="margin-bottom:12px;">
        <div class="bank-title">Bank Details</div>
        ${[
          ['Bank', biz.bankDetails.bankName],
          ['A/C No', biz.bankDetails.accountNumber],
          ['IFSC', biz.bankDetails.ifsc],
          ['Branch', biz.bankDetails.branch],
          ['UPI', biz.bankDetails.upiId],
        ].filter(([,v])=>v).map(([k,v])=>`<div class="bank-row"><span class="bank-key">${k}</span><span class="bank-val">${v}</span></div>`).join('')}
      </div>` : ''}
      ${invoice.notes ? `<div class="bank-card"><div class="bank-title">Notes</div><div style="font-size:11px;color:#374151;">${invoice.notes}</div></div>` : ''}
    </div>

    <!-- Totals -->
    <div class="totals-card">
      <!-- Tax pills -->
      <div class="tax-pills">
        ${invoice.taxType === 'intra' ? `
          <div class="tax-pill"><div class="tax-pill-label">CGST</div><div class="tax-pill-val">₹${fmt(tot.totalCgst)}</div></div>
          <div class="tax-pill"><div class="tax-pill-label">SGST</div><div class="tax-pill-val">₹${fmt(tot.totalSgst)}</div></div>
        ` : `
          <div class="tax-pill igst"><div class="tax-pill-label">IGST</div><div class="tax-pill-val">₹${fmt(tot.totalIgst)}</div></div>
        `}
      </div>

      <div class="totals-row"><span>Subtotal</span><span>₹${fmt(tot.subtotal)}</span></div>
      ${tot.totalDiscount > 0 ? `<div class="totals-row" style="color:#EF4444;"><span>Discount</span><span>-₹${fmt(tot.totalDiscount)}</span></div>` : ''}
      <div class="totals-row taxable"><span>Taxable Value</span><span>₹${fmt(tot.taxableValue)}</span></div>
      <div class="totals-row"><span>Total Tax</span><span>₹${fmt(tot.totalTax)}</span></div>
      ${tot.roundOff ? `<div class="totals-row"><span>Round Off</span><span>${tot.roundOff > 0 ? '+' : ''}₹${fmt(tot.roundOff)}</span></div>` : ''}
      <div class="totals-row grand"><span class="t-label">GRAND TOTAL</span><span>₹${fmtI(tot.grandTotal)}</span></div>

      <div class="words-box">✓ ${tot.grandTotalWords || ''}</div>
    </div>
  </div>

  ${invoice.termsAndConditions ? `
  <div style="margin-top:12px; padding:8px 10px; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:6px; font-size:9px; color:#6B7280;">
    <b style="color:#374151;">Terms & Conditions:</b><br/>${invoice.termsAndConditions.replace(/\n/g,'<br/>')}
  </div>` : ''}

  <!-- Signatures -->
  <div class="footer">
    <div class="sig-block">
      <div class="sig-line">Authorised Signatory</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">For ${biz.name || ''}<br/>Authorised Signatory</div>
    </div>
  </div>
  <div class="footer-note">This is a computer generated invoice · BillFlow</div>

</div>
</body>
</html>`;
}

module.exports = { modernTemplate };
