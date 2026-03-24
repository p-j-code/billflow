import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, RefreshCw, Download } from 'lucide-react';
import clsx from 'clsx';
import { numberToWords } from '@/hooks/useGstCalc';

function fmt(n)  { return Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtI(n) { return Number(n||0).toLocaleString('en-IN'); }
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'});
}

function buildTraditionalHtml({ invoice, business, items, totals, party, taxType, theme, themeConfig }) {
  const showLot = business?.invoiceSettings?.showLotBatch !== false;
  const showHsn = business?.invoiceSettings?.showHsnOnInvoice !== false;
  const biz = business || {};
  const tot = totals || {};
  const grandTotal = tot.grandTotal || 0;

  // ── Resolve theme colours ──────────────────────────────────────────────────
  const ACCENT  = themeConfig?.accentColor || (theme === 'modern' ? '#F59E0B' : '#000000');
  const HDR_BG  = themeConfig?.headerBg    || (theme === 'modern' ? '#111827' : '#000000');
  const HDR_TXT = themeConfig?.headerText  || '#ffffff';
  const T_FONT  = themeConfig?.fontFamily === 'serif' ? 'Georgia, serif'
                : themeConfig?.fontFamily === 'mono'  ? '"Courier New", monospace'
                : theme === 'modern' ? "'Segoe UI', Arial, sans-serif" : 'Arial, sans-serif';

  const docTitle = { sale:'TAX INVOICE', purchase:'PURCHASE INVOICE', credit_note:'CREDIT NOTE', proforma:'PROFORMA INVOICE' }[invoice.invoiceType] || 'TAX INVOICE';
  const emptyRows = Math.max(0, 10 - (items?.length || 0));

  if (theme === 'modern') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:${T_FONT};font-size:12px;color:#1F2937;background:#fff;padding:16px;}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid ${ACCENT};}
.biz-name{font-size:20px;font-weight:800;color:${HDR_BG};}.biz-sub{font-size:10px;color:#6B7280;margin-top:2px;}
.biz-gstin{display:inline-block;margin-top:5px;background:${ACCENT}22;border:1px solid ${ACCENT};border-radius:4px;padding:2px 8px;font-size:9px;font-weight:700;color:${HDR_BG};}
.inv-badge{text-align:right;}.inv-type{font-size:12px;font-weight:700;color:${ACCENT};text-transform:uppercase;}
.inv-no{font-size:22px;font-weight:800;color:${HDR_BG};}
.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;}
.info-card{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:8px 10px;}
.lbl{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;font-weight:700;margin-bottom:3px;}
.val{font-size:11px;font-weight:600;color:${HDR_BG};}.val-sub{font-size:9px;color:#6B7280;margin-top:1px;}
table{width:100%;border-collapse:collapse;margin-bottom:12px;}
thead tr{background:${HDR_BG};color:${HDR_TXT};}th{padding:6px 8px;font-size:9px;font-weight:700;text-align:left;}
th.r{text-align:right;}th.c{text-align:center;}
tbody tr{border-bottom:1px solid #F3F4F6;}tbody tr:nth-child(even){background:#FAFAFA;}
td{padding:5px 8px;font-size:11px;}td.r{text-align:right;}td.c{text-align:center;}
.hsn{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:3px;padding:1px 4px;font-size:8px;color:#1D4ED8;font-weight:700;}
.lot{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:3px;padding:1px 4px;font-size:8px;color:#15803D;}
.bottom{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.totals .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #F3F4F6;font-size:11px;}
.totals .taxable{background:${ACCENT}22;padding:5px 8px;border-radius:4px;font-weight:700;margin:3px 0;border:none;}
.totals .grand{background:${HDR_BG};color:${HDR_TXT};padding:8px 12px;border-radius:6px;margin-top:6px;font-size:13px;font-weight:800;border:none;}
.totals .grand .tl{color:${ACCENT};}
.tax-pills{display:flex;gap:6px;margin-bottom:8px;}
.tp{flex:1;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:5px;padding:5px 8px;text-align:center;}
.tp.igst{background:#FFF7ED;border-color:#FED7AA;}
.tp-l{font-size:8px;color:#6B7280;font-weight:700;text-transform:uppercase;}
.tp-v{font-size:12px;font-weight:800;color:#1D4ED8;}.tp.igst .tp-v{color:#C2410C;}
.words{background:#ECFDF5;border:1px solid #A7F3D0;border-radius:5px;padding:6px 8px;margin-top:8px;font-size:9px;color:#065F46;font-weight:600;}
.bank-card{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:10px;}
.bank-row{display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;padding-top:12px;border-top:2px solid #E5E7EB;}
.sig-b{text-align:center;}.sig-l{border-top:1px solid #9CA3AF;margin-top:24px;padding-top:4px;font-size:9px;color:#6B7280;}
.footer-note{text-align:center;font-size:8px;color:#9CA3AF;margin-top:10px;}
</style></head><body>
<div class="header">
  <div>
    <div class="biz-name">${biz.name||'Your Business'}</div>
    <div class="biz-sub">${[biz.address?.line1,biz.address?.city,biz.address?.state].filter(Boolean).join(', ')}</div>
    ${biz.mobile?`<div class="biz-sub">📞 +91 ${biz.mobile}</div>`:''}
    ${biz.gstin?`<div><span class="biz-gstin">GSTIN: ${biz.gstin}</span></div>`:''}
  </div>
  <div class="inv-badge">
    <div class="inv-type">${docTitle}</div>
    <div class="inv-no">#${invoice.invoiceNo||'—'}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-card">
    <div class="lbl">Bill To</div>
    <div class="val">${party?.name||'—'}</div>
    ${party?.address?`<div class="val-sub">${party.address}</div>`:''}
    ${party?.gstin?`<div class="val-sub" style="font-weight:700">GST: ${party.gstin}</div>`:''}
  </div>
  <div class="info-card">
    <div class="lbl">Invoice Date</div><div class="val">${fmtDate(invoice.invoiceDate||new Date())}</div>
    ${invoice.dueDate?`<div class="lbl" style="margin-top:6px">Due Date</div><div class="val">${fmtDate(invoice.dueDate)}</div>`:''}
  </div>
  <div class="info-card">
    ${invoice.transport?`<div class="lbl">Transport</div><div class="val">${invoice.transport}</div>`:''}
    <div class="lbl" style="margin-top:6px">Tax Type</div>
    <div class="val" style="color:${taxType==='intra'?'#059669':'#D97706'}">${taxType==='intra'?'Intra-State (SGST+CGST)':'Inter-State (IGST)'}</div>
  </div>
</div>

<table>
  <thead><tr>
    <th style="width:24px">#</th><th>Description</th>
    ${showHsn?'<th class="c" style="width:60px">HSN</th>':''}
    ${showLot?'<th class="c" style="width:50px">LOT</th>':''}
    <th class="c" style="width:36px">Qty</th><th class="c" style="width:32px">Unit</th>
    <th class="r" style="width:60px">Rate</th><th class="c" style="width:40px">Disc%</th>
    <th class="c" style="width:45px">Tax%</th><th class="r" style="width:70px">Amount</th>
  </tr></thead>
  <tbody>
    ${(items||[]).map((item,i)=>`<tr>
      <td class="c" style="color:#9CA3AF">${i+1}</td>
      <td><b>${item.description||''}</b></td>
      ${showHsn?`<td class="c">${item.hsnCode?`<span class="hsn">${item.hsnCode}</span>`:'—'}</td>`:''}
      ${showLot?`<td class="c">${item.lot?`<span class="lot">${item.lot}</span>`:'—'}</td>`:''}
      <td class="c"><b>${item.qty||0}</b></td>
      <td class="c" style="color:#6B7280">${item.unit||'PCS'}</td>
      <td class="r">₹${fmt(item.rate)}</td>
      <td class="c">${item.discountPct?item.discountPct+'%':'—'}</td>
      <td class="c">${item.taxablePct?item.taxablePct+'%':'—'}</td>
      <td class="r"><b>₹${fmt(item.taxableAmt||(item.qty*item.rate))}</b></td>
    </tr>`).join('')}
  </tbody>
  <tfoot><tr style="background:#F3F4F6;font-weight:700;">
    <td colspan="${4+(showHsn?1:0)+(showLot?1:0)}" class="r" style="color:#6B7280;font-size:9px">TOTAL QTY: ${fmtI(tot.totalQty)}</td>
    <td colspan="4" class="r">₹${fmt(tot.taxableValue)}</td>
  </tr></tfoot>
</table>

<div class="bottom">
  <div>
    ${biz.bankDetails?.bankName?`<div class="bank-card"><div class="lbl" style="margin-bottom:6px">Bank Details</div>
      ${[['Bank',biz.bankDetails.bankName],['A/C',biz.bankDetails.accountNumber],['IFSC',biz.bankDetails.ifsc],['UPI',biz.bankDetails.upiId]].filter(([,v])=>v).map(([k,v])=>`<div class="bank-row"><span style="color:#6B7280">${k}</span><span style="font-weight:600">${v}</span></div>`).join('')}
    </div>`:''}
    ${invoice.notes?`<div class="bank-card" style="margin-top:8px"><div class="lbl" style="margin-bottom:4px">Notes</div><div style="font-size:11px">${invoice.notes}</div></div>`:''}
  </div>
  <div class="totals">
    <div class="tax-pills">
      ${taxType==='intra'
        ?`<div class="tp"><div class="tp-l">CGST</div><div class="tp-v">₹${fmt(tot.totalCgst)}</div></div><div class="tp"><div class="tp-l">SGST</div><div class="tp-v">₹${fmt(tot.totalSgst)}</div></div>`
        :`<div class="tp igst"><div class="tp-l">IGST</div><div class="tp-v">₹${fmt(tot.totalIgst)}</div></div>`}
    </div>
    <div class="row"><span>Subtotal</span><span>₹${fmt(tot.subtotal)}</span></div>
    ${tot.totalDiscount>0?`<div class="row" style="color:#EF4444"><span>Discount</span><span>-₹${fmt(tot.totalDiscount)}</span></div>`:''}
    <div class="row taxable"><span>Taxable Value</span><span>₹${fmt(tot.taxableValue)}</span></div>
    <div class="row"><span>Total Tax</span><span>₹${fmt(tot.totalTax)}</span></div>
    <div class="row grand"><span class="tl">GRAND TOTAL</span><span>₹${fmtI(grandTotal)}</span></div>
    <div class="words">✓ ${numberToWords(grandTotal)}</div>
  </div>
</div>

<div class="sig">
  <div class="sig-b"><div class="sig-l">Authorised Signatory</div></div>
  <div class="sig-b"><div class="sig-l">For ${biz.name||''}<br/>Authorised Signatory</div></div>
</div>
<div class="footer-note">computer generated invoice · BillFlow</div>
</body></html>`;
  }

  // Traditional theme
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;padding:8px;}
table{width:100%;border-collapse:collapse;}td,th{border:1px solid #000;padding:3px 5px;}
th{background:#f0f0f0;font-weight:bold;text-align:center;}
.nb td{border:none;}.c{text-align:center;}.r{text-align:right;}.b{font-weight:bold;}
.header-title{text-align:center;font-size:20px;font-weight:bold;letter-spacing:1px;}
.gstin{text-align:center;font-size:11px;font-weight:bold;border:1px solid #000;padding:3px;margin:3px 0;}
.grand td{background:${HDR_BG};color:${HDR_TXT};font-weight:bold;font-size:13px;}
</style></head><body>
<div style="border:2px solid #000;padding:5px;margin-bottom:3px;text-align:center">
  <div style="font-size:8px;margin-bottom:1px">${docTitle}</div>
  <div class="header-title">${biz.name||'Your Business'}</div>
  <div style="font-size:10px">${[biz.address?.line1,biz.address?.city,biz.address?.state].filter(Boolean).join(', ')}</div>
  ${biz.mobile?`<div style="font-size:9px">MOB: +91 ${biz.mobile}</div>`:''}
</div>
${biz.gstin?`<div class="gstin">GSTIN NO. : ${biz.gstin}</div>`:''}
<table style="margin-bottom:3px"><tr>
  <td width="55%" style="vertical-align:top">
    <div style="font-size:9px;color:#555">Name:</div><div style="font-weight:600;font-size:12px">${party?.name||'—'}</div>
    ${party?.address?`<div style="font-size:9px;color:#555;margin-top:2px">Address:</div><div>${party.address}</div>`:''}
    ${party?.state?`<div style="margin-top:2px"><span style="font-size:9px;color:#555">State: </span><b>${party.state}</b><span style="font-size:9px;color:#555;margin-left:8px">Code: </span><b>${party.stateCode||''}</b></div>`:''}
    ${party?.gstin?`<div style="margin-top:2px;font-size:9px;color:#555">GSTIN: <b style="color:#000">${party.gstin}</b></div>`:''}
  </td>
  <td width="45%" style="vertical-align:top">
    <table class="nb"><tr><td style="border:none;padding:1px 3px"><span style="font-size:9px;color:#555">Invoice no.: </span><b>${invoice.invoiceNo||'—'}</b></td></tr>
    <tr><td style="border:none;padding:1px 3px"><span style="font-size:9px;color:#555">Date: </span><b>${fmtDate(invoice.invoiceDate||new Date())}</b></td></tr>
    ${invoice.transport?`<tr><td style="border:none;padding:1px 3px"><span style="font-size:9px;color:#555">Transport: </span>${invoice.transport}</td></tr>`:''}
    </table>
  </td>
</tr></table>

<table style="margin-bottom:0">
  <thead><tr>
    <th style="width:24px">SR.</th><th>Description</th>
    ${showHsn?'<th style="width:55px">HSN</th>':''}
    ${showLot?'<th style="width:42px">LOT</th>':''}
    <th style="width:38px">Qty</th><th style="width:32px">Unit</th>
    <th style="width:60px">Rate</th><th style="width:70px">Amount</th>
  </tr></thead>
  <tbody>
    ${(items||[]).map((item,i)=>`<tr>
      <td class="c">${i+1}</td><td>${item.description||''}</td>
      ${showHsn?`<td class="c">${item.hsnCode||''}</td>`:''}
      ${showLot?`<td class="c">${item.lot||''}</td>`:''}
      <td class="c">${item.qty||0}</td><td class="c">${item.unit||'PCS'}</td>
      <td class="r">${fmt(item.rate)}</td>
      <td class="r">${fmt(item.taxableAmt||(item.qty*item.rate))}</td>
    </tr>`).join('')}
    ${Array.from({length:emptyRows}).map(()=>`<tr><td>&nbsp;</td><td></td>${showHsn?'<td></td>':''}${showLot?'<td></td>':''}<td></td><td></td><td></td><td class="r">0.00</td></tr>`).join('')}
  </tbody>
</table>
<table style="margin-top:-1px">
  <tr>
    <td rowspan="8" style="vertical-align:top;width:50%">
      ${biz.bankDetails?.bankName?`<div style="font-size:9px;color:#555">Bank: ${biz.bankDetails.bankName}</div>
        ${biz.bankDetails.accountNumber?`<div style="font-size:9px">A/C: ${biz.bankDetails.accountNumber}</div>`:''}
        ${biz.bankDetails.ifsc?`<div style="font-size:9px">IFSC: ${biz.bankDetails.ifsc}</div>`:''}
        ${biz.bankDetails.upiId?`<div style="font-size:9px">UPI: ${biz.bankDetails.upiId}</div>`:''}` : ''}
    </td>
    <td class="b">TOTAL</td><td class="r b">${fmt(tot.subtotal)}</td>
  </tr>
  <tr><td>TAXABLE VALUE</td><td class="r b">${fmt(tot.taxableValue)}</td></tr>
  ${taxType==='intra'
    ?`<tr><td>SGST</td><td class="r">${fmt(tot.totalSgst)}</td></tr><tr><td>CGST</td><td class="r">${fmt(tot.totalCgst)}</td></tr>`
    :`<tr><td>IGST</td><td class="r">${fmt(tot.totalIgst)}</td></tr>`}
  ${tot.roundOff?`<tr><td>Round Off</td><td class="r">${fmt(tot.roundOff)}</td></tr>`:''}
  <tr class="grand"><td class="b">GRAND TOTAL</td><td class="r b" style="font-size:14px">₹${fmtI(grandTotal)}</td></tr>
</table>
<div style="border:1px solid #000;border-top:none;padding:3px 6px;font-size:9px"><b>Amount in Words:</b> ${numberToWords(grandTotal)}</div>
<table style="margin-top:6px;border:none"><tr>
  <td style="border:none;width:50%;text-align:center;padding-top:24px"><div style="border-top:1px solid #000;display:inline-block;width:70%;padding-top:3px;font-size:9px">authorised signature</div></td>
  <td style="border:none;width:50%;text-align:center;padding-top:24px"><div style="border-top:1px solid #000;display:inline-block;width:70%;padding-top:3px;font-size:9px;font-weight:bold">FOR: ${biz.name||''}<br/><span style="font-weight:normal">authorised signature</span></div></td>
</tr></table>
<div style="text-align:center;font-size:8px;color:#888;margin-top:6px;border-top:1px dashed #ccc;padding-top:3px">computer generated invoice</div>
</body></html>`;
}

export default function InvoicePreview({ invoice, business, items, totals, party, taxType, theme = 'traditional', invoiceNo, themeConfig = null }) {
  const iframeRef = useRef(null);
  const [scale, setScale]   = useState('desktop');
  const [loading, setLoading] = useState(true);

  const html = buildTraditionalHtml({ invoice: { ...invoice, invoiceNo }, business, items, totals, party, taxType, theme, themeConfig });

  useEffect(() => {
    if (!iframeRef.current) return;
    setLoading(true);
    const doc = iframeRef.current.contentDocument;
    doc.open(); doc.write(html); doc.close();
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [html]);

  return (
    <div className="flex flex-col h-full">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          <span className="text-xs text-muted ml-2 font-mono">invoice-preview.pdf</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setScale(s => s === 'desktop' ? 'mobile' : 'desktop')}
            className="btn-ghost p-1.5 text-xs flex items-center gap-1">
            {scale === 'desktop' ? <Monitor size={13} /> : <Smartphone size={13} />}
          </button>
          {loading && <RefreshCw size={13} className="text-amber-500 animate-spin" />}
        </div>
      </div>

      {/* iframe preview */}
      <div className={clsx('flex-1 bg-stone-200 overflow-auto flex justify-center py-4', loading && 'opacity-50')}>
        <div className={clsx('bg-white shadow-xl transition-all duration-300', scale === 'mobile' ? 'w-[375px]' : 'w-full max-w-[794px]')}>
          <iframe
            ref={iframeRef}
            title="Invoice Preview"
            style={{ width: '100%', height: scale === 'mobile' ? '900px' : '1050px', border: 'none', display: 'block' }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
