/**
 * BillFlow — GST Calculation Engine
 * Handles: intra-state (SGST+CGST) and inter-state (IGST)
 * All amounts rounded to 2 decimal places
 */

const UNITS = ['PCS', 'NOS', 'KGS', 'GMS', 'MTR', 'CM', 'LTR', 'ML', 'SET',
               'PAIR', 'BOX', 'PKT', 'DOZ', 'SQF', 'SQM', 'RMT', 'BAG',
               'BTL', 'CTN', 'BDL', 'JOB', 'HRS', 'DAY', 'MON'];

const r2 = (n) => Math.round((n || 0) * 100) / 100;

/**
 * Determine GST type from business & party state codes
 * intra = SGST + CGST, inter = IGST
 */
function determineTaxType(businessStateCode, partyStateCode, partyGstin) {
  if (!partyGstin && !partyStateCode) return 'intra'; // B2C default intra
  const pCode = partyStateCode || (partyGstin ? partyGstin.substring(0, 2) : null);
  if (!pCode || !businessStateCode) return 'intra';
  return pCode === businessStateCode ? 'intra' : 'inter';
}

/**
 * Calculate a single line item's tax breakdown
 */
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

  const totalAmt = r2(taxableAmt + cgstAmt + sgstAmt + igstAmt);

  return {
    ...item,
    discountAmt,
    taxableAmt,
    cgstPct, cgstAmt,
    sgstPct, sgstAmt,
    igstPct, igstAmt,
    totalAmt,
  };
}

/**
 * Calculate full invoice totals from line items
 */
function calcInvoiceTotals(items, taxType, invoiceDiscountPct = 0) {
  let subtotal      = 0;
  let totalDiscount = 0;
  let taxableValue  = 0;
  let totalCgst     = 0;
  let totalSgst     = 0;
  let totalIgst     = 0;
  let totalQty      = 0;

  const calcedItems = items.map((item, idx) => {
    const calc = calcLineItem(item, taxType);
    subtotal      += r2(Number(item.qty || 0) * Number(item.rate || 0));
    totalDiscount += calc.discountAmt;
    taxableValue  += calc.taxableAmt;
    totalCgst     += calc.cgstAmt;
    totalSgst     += calc.sgstAmt;
    totalIgst     += calc.igstAmt;
    totalQty      += Number(item.qty || 0);
    return { ...calc, srNo: idx + 1 };
  });

  // Invoice-level discount (applied after item discounts)
  const invoiceDiscountAmt = r2(taxableValue * invoiceDiscountPct / 100);
  taxableValue  = r2(taxableValue  - invoiceDiscountAmt);
  totalCgst     = r2(totalCgst    * (1 - invoiceDiscountPct / 100));
  totalSgst     = r2(totalSgst    * (1 - invoiceDiscountPct / 100));
  totalIgst     = r2(totalIgst    * (1 - invoiceDiscountPct / 100));
  totalDiscount = r2(totalDiscount + invoiceDiscountAmt);

  const totalTax   = r2(totalCgst + totalSgst + totalIgst);
  const rawTotal   = r2(taxableValue + totalTax);
  const roundOff   = r2(Math.round(rawTotal) - rawTotal);
  const grandTotal = Math.round(rawTotal);

  return {
    items: calcedItems,
    totals: {
      subtotal:        r2(subtotal),
      totalDiscount:   r2(totalDiscount),
      taxableValue:    r2(taxableValue),
      totalCgst:       r2(totalCgst),
      totalSgst:       r2(totalSgst),
      totalIgst:       r2(totalIgst),
      totalTax:        r2(totalTax),
      roundOff,
      grandTotal,
      grandTotalWords: numberToWords(grandTotal),
      totalQty:        r2(totalQty),
    },
  };
}

/**
 * Convert number to Indian words
 * e.g. 34440 → "Thirty Four Thousand Four Hundred Forty Only"
 */
function numberToWords(num) {
  if (!num || num === 0) return 'Zero Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
                 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
                 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
                'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n === 0)   return '';
    if (n < 20)    return ones[n] + ' ';
    if (n < 100)   return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    if (n < 1000)  return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + 'Crore ' + convert(n % 10000000);
  }

  const rupees = Math.floor(num);
  const paise  = Math.round((num - rupees) * 100);
  let result   = convert(rupees).trim();
  if (paise > 0) result += ` and ${convert(paise).trim()} Paise`;
  return result + ' Only';
}

/**
 * Generate next invoice number from business series
 * Mutates business.invoiceSeries[type].currentNumber — call business.save() after
 */
function generateInvoiceNo(business, type = 'sale') {
  const series = business.invoiceSeries?.find(s => s.type === type);
  if (!series) throw new Error(`Invoice series not configured for type: ${type}`);

  series.currentNumber = (series.currentNumber || 0) + 1;
  const n  = series.currentNumber;
  const fy = series.financialYear || business.currentFinancialYear;

  let formatted = '';
  switch (series.format) {
    case 'NUM_FY':        formatted = `${n}/${fy}`;              break;
    case 'PREFIX_NUM_FY': formatted = `${series.prefix}${n}/${fy}`; break;
    case 'PREFIX_NUM':    formatted = `${series.prefix}${n}`;   break;
    default:              formatted = `${n}/${fy}`;
  }

  return formatted;
}

module.exports = {
  determineTaxType,
  calcLineItem,
  calcInvoiceTotals,
  numberToWords,
  generateInvoiceNo,
  UNITS,
  r2,
};
