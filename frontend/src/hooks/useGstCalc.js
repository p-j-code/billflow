/**
 * useGstCalc — client-side GST calculation hook
 * Mirrors the backend gstCalc.js logic for instant live preview
 * No API call needed for every keystroke
 */

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function calcLineItem(item, taxType) {
  const qty         = Number(item.qty)         || 0;
  const rate        = Number(item.rate)        || 0;
  const discountPct = Number(item.discountPct) || 0;
  const gstRate     = Number(item.taxablePct)  || 0;

  const grossAmt    = r2(qty * rate);
  const discountAmt = r2(grossAmt * discountPct / 100);
  const taxableAmt  = r2(grossAmt - discountAmt);

  let cgstPct = 0, sgstPct = 0, igstPct = 0;
  let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;

  if (taxType === 'inter') {
    igstPct = gstRate;
    igstAmt = r2(taxableAmt * igstPct / 100);
  } else {
    cgstPct = r2(gstRate / 2);
    sgstPct = r2(gstRate / 2);
    cgstAmt = r2(taxableAmt * cgstPct / 100);
    sgstAmt = r2(taxableAmt * sgstPct / 100);
  }

  return {
    ...item,
    discountAmt, taxableAmt,
    cgstPct, cgstAmt, sgstPct, sgstAmt, igstPct, igstAmt,
    totalAmt: r2(taxableAmt + cgstAmt + sgstAmt + igstAmt),
  };
}

export function calcInvoiceTotals(items, taxType, invoiceDiscountPct = 0) {
  let subtotal = 0, totalDiscount = 0, taxableValue = 0;
  let totalCgst = 0, totalSgst = 0, totalIgst = 0, totalQty = 0;

  const calcedItems = items.map((item, idx) => {
    const c = calcLineItem(item, taxType);
    subtotal      += r2((Number(item.qty) || 0) * (Number(item.rate) || 0));
    totalDiscount += c.discountAmt;
    taxableValue  += c.taxableAmt;
    totalCgst     += c.cgstAmt;
    totalSgst     += c.sgstAmt;
    totalIgst     += c.igstAmt;
    totalQty      += Number(item.qty) || 0;
    return { ...c, srNo: idx + 1 };
  });

  const invDiscAmt = r2(taxableValue * invoiceDiscountPct / 100);
  taxableValue  = r2(taxableValue - invDiscAmt);
  totalCgst     = r2(totalCgst  * (1 - invoiceDiscountPct / 100));
  totalSgst     = r2(totalSgst  * (1 - invoiceDiscountPct / 100));
  totalIgst     = r2(totalIgst  * (1 - invoiceDiscountPct / 100));
  totalDiscount = r2(totalDiscount + invDiscAmt);

  const totalTax   = r2(totalCgst + totalSgst + totalIgst);
  const rawTotal   = r2(taxableValue + totalTax);
  const roundOff   = r2(Math.round(rawTotal) - rawTotal);
  const grandTotal = Math.round(rawTotal);

  return {
    items: calcedItems,
    totals: {
      subtotal: r2(subtotal), totalDiscount: r2(totalDiscount),
      taxableValue: r2(taxableValue),
      totalCgst: r2(totalCgst), totalSgst: r2(totalSgst), totalIgst: r2(totalIgst),
      totalTax: r2(totalTax), roundOff, grandTotal, totalQty: r2(totalQty),
    },
  };
}

export function numberToWords(num) {
  if (!num || num === 0) return 'Zero Only';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function convert(n) {
    if (n === 0)    return '';
    if (n < 20)     return ones[n] + ' ';
    if (n < 100)    return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '') + ' ';
    if (n < 1000)   return ones[Math.floor(n/100)] + ' Hundred ' + convert(n%100);
    if (n < 100000) return convert(Math.floor(n/1000)) + 'Thousand ' + convert(n%1000);
    if (n < 10000000) return convert(Math.floor(n/100000)) + 'Lakh ' + convert(n%100000);
    return convert(Math.floor(n/10000000)) + 'Crore ' + convert(n%10000000);
  }
  return convert(Math.floor(num)).trim() + ' Only';
}

export const UNITS = ['PCS','NOS','KGS','GMS','MTR','CM','LTR','ML','SET',
  'PAIR','BOX','PKT','DOZ','SQF','SQM','RMT','BAG','BTL','CTN','BDL','JOB','HRS','DAY','MON'];

export const GST_RATES = [0, 0.25, 0.5, 1, 1.5, 3, 5, 6, 7.5, 9, 12, 14, 18, 28];
