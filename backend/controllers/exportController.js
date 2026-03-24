const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Party   = require('../models/Party');
const { AppError } = require('../middleware/errorHandler');

function fmt(n)  { return Math.round((Number(n) || 0) * 100) / 100; }
function fmtD(d) { return d ? new Date(d).toLocaleDateString('en-IN') : ''; }

// Build XLSX buffer using raw binary — no npm dep needed
// We generate CSV for max compatibility, or use a simple XLSX builder
// Using SheetJS-compatible manual XML approach if xlsx not installed

async function tryXlsx() {
  try { return require('xlsx'); } catch { return null; }
}

// Generic CSV fallback
function toCsv(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  rows.forEach(row => lines.push(row.map(escape).join(',')));
  return lines.join('\n');
}

// ─── SALES REGISTER EXPORT ────────────────────────────────────────────────────
// GET /api/exports/sales-register?fy=25-26&type=sale
const exportSalesRegister = async (req, res, next) => {
  try {
    const { fy, type = 'sale', from, to } = req.query;

    let dateFilter = {};
    if (fy) {
      const startYear = 2000 + parseInt(fy.split('-')[0]);
      dateFilter = { $gte: new Date(`${startYear}-04-01`), $lte: new Date(`${startYear + 1}-03-31T23:59:59`) };
    } else if (from || to) {
      if (from) dateFilter.$gte = new Date(from);
      if (to)   dateFilter.$lte = new Date(to);
    }

    const invoices = await Invoice.find({
      businessId:  req.businessId,
      invoiceType: type,
      status:      { $nin: ['void', 'cancelled'] },
      ...(Object.keys(dateFilter).length ? { invoiceDate: dateFilter } : {}),
    }).sort({ invoiceDate: 1 });

    const HEADERS = [
      'Sr No', 'Invoice No', 'Invoice Date', 'Due Date',
      'Party Name', 'Party GSTIN', 'Party State',
      'Tax Type', 'Status',
      'Subtotal', 'Discount', 'Taxable Value',
      'CGST', 'SGST', 'IGST', 'Total Tax',
      'Grand Total', 'Amount Paid', 'Balance Due',
    ];

    const rows = invoices.map((inv, i) => [
      i + 1,
      inv.invoiceNo,
      fmtD(inv.invoiceDate),
      fmtD(inv.dueDate),
      inv.partySnapshot?.name     || '',
      inv.partySnapshot?.gstin    || '',
      inv.partySnapshot?.state    || '',
      inv.taxType === 'intra' ? 'Intra (SGST+CGST)' : 'Inter (IGST)',
      inv.status,
      fmt(inv.totals?.subtotal),
      fmt(inv.totals?.totalDiscount),
      fmt(inv.totals?.taxableValue),
      fmt(inv.totals?.totalCgst),
      fmt(inv.totals?.totalSgst),
      fmt(inv.totals?.totalIgst),
      fmt(inv.totals?.totalTax),
      fmt(inv.totals?.grandTotal),
      fmt(inv.amountPaid),
      fmt(inv.balanceDue),
    ]);

    // Totals row
    rows.push([
      '', 'TOTAL', '', '', '', '', '', '', '',
      fmt(invoices.reduce((s,i) => s + (i.totals?.subtotal || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.totals?.totalDiscount || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.totals?.taxableValue || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.totals?.totalCgst || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.totals?.totalSgst || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.totals?.totalIgst || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.totals?.totalTax || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.totals?.grandTotal || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.amountPaid || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.balanceDue || 0), 0)),
    ]);

    const xlsx = await tryXlsx();
    if (xlsx) {
      const ws  = xlsx.utils.aoa_to_sheet([HEADERS, ...rows]);
      const wb  = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sales Register');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.set({
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Sales_Register_${fy || 'export'}.xlsx"`,
      });
      return res.send(buf);
    }

    // CSV fallback
    const csv = toCsv(HEADERS, rows);
    res.set({
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="Sales_Register_${fy || 'export'}.csv"`,
    });
    return res.send(csv);
  } catch (err) { next(err); }
};

// ─── PARTY OUTSTANDING EXPORT ─────────────────────────────────────────────────
// GET /api/exports/outstanding?type=customer
const exportOutstanding = async (req, res, next) => {
  try {
    const { partyType = 'customer' } = req.query;

    const outstanding = await Invoice.aggregate([
      {
        $match: {
          businessId:  req.businessId,
          invoiceType: partyType === 'supplier' ? 'purchase' : 'sale',
          status:      { $in: ['sent', 'partial', 'overdue'] },
          balanceDue:  { $gt: 0 },
        },
      },
      {
        $group: {
          _id:              '$partyId',
          partyName:        { $first: '$partySnapshot.name'     },
          partyGstin:       { $first: '$partySnapshot.gstin'    },
          partyState:       { $first: '$partySnapshot.state'    },
          totalInvoiced:    { $sum:   '$totals.grandTotal'       },
          totalPaid:        { $sum:   '$amountPaid'              },
          totalOutstanding: { $sum:   '$balanceDue'              },
          invoiceCount:     { $sum:   1                          },
          oldestDue:        { $min:   '$dueDate'                 },
          invoiceNos:       { $push:  '$invoiceNo'               },
        },
      },
      { $sort: { totalOutstanding: -1 } },
    ]);

    // Per-invoice detail rows
    const invoices = await Invoice.find({
      businessId:  req.businessId,
      invoiceType: partyType === 'supplier' ? 'purchase' : 'sale',
      status:      { $in: ['sent', 'partial', 'overdue'] },
      balanceDue:  { $gt: 0 },
    }).sort({ 'partySnapshot.name': 1, invoiceDate: 1 });

    const HEADERS = [
      'Party Name', 'GSTIN', 'State',
      'Invoice No', 'Invoice Date', 'Due Date', 'Status',
      'Grand Total', 'Paid', 'Outstanding', 'Overdue',
    ];

    const rows = invoices.map(inv => [
      inv.partySnapshot?.name  || '',
      inv.partySnapshot?.gstin || '',
      inv.partySnapshot?.state || '',
      inv.invoiceNo,
      fmtD(inv.invoiceDate),
      fmtD(inv.dueDate),
      inv.status,
      fmt(inv.totals?.grandTotal),
      fmt(inv.amountPaid),
      fmt(inv.balanceDue),
      new Date(inv.dueDate) < new Date() ? fmt(inv.balanceDue) : 0,
    ]);

    rows.push([
      'TOTAL', '', '', '', '', '', '',
      fmt(invoices.reduce((s,i) => s + (i.totals?.grandTotal || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.amountPaid || 0), 0)),
      fmt(invoices.reduce((s,i) => s + (i.balanceDue || 0), 0)),
      '',
    ]);

    const xlsx = await tryXlsx();
    if (xlsx) {
      const wb = xlsx.utils.book_new();

      // Sheet 1: Summary
      const summaryHeaders = ['Party Name', 'GSTIN', 'State', 'Invoices', 'Total Invoiced', 'Paid', 'Outstanding', 'Oldest Due'];
      const summaryRows = outstanding.map(o => [
        o.partyName, o.partyGstin, o.partyState,
        o.invoiceCount, fmt(o.totalInvoiced), fmt(o.totalPaid), fmt(o.totalOutstanding), fmtD(o.oldestDue),
      ]);
      xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]), 'Summary');

      // Sheet 2: Detail
      xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([HEADERS, ...rows]), 'Invoice Detail');

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.set({
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Outstanding_${partyType}.xlsx"`,
      });
      return res.send(buf);
    }

    const csv = toCsv(HEADERS, rows);
    res.set({
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="Outstanding_${partyType}.csv"`,
    });
    return res.send(csv);
  } catch (err) { next(err); }
};

// ─── PAYMENT REGISTER EXPORT ──────────────────────────────────────────────────
const exportPayments = async (req, res, next) => {
  try {
    const { from, to, fy } = req.query;
    let dateFilter = {};
    if (fy) {
      const startYear = 2000 + parseInt(fy.split('-')[0]);
      dateFilter = { $gte: new Date(`${startYear}-04-01`), $lte: new Date(`${startYear + 1}-03-31T23:59:59`) };
    } else if (from || to) {
      if (from) dateFilter.$gte = new Date(from);
      if (to)   dateFilter.$lte = new Date(to);
    }

    const payments = await Payment.find({
      businessId: req.businessId,
      ...(Object.keys(dateFilter).length ? { paymentDate: dateFilter } : {}),
    }).sort({ paymentDate: 1 });

    const HEADERS = ['Sr No', 'Date', 'Party', 'Invoice No', 'Mode', 'Reference', 'Bank', 'Amount', 'Notes'];
    const rows = payments.map((p, i) => [
      i + 1, fmtD(p.paymentDate), p.partyName || '', p.invoiceNo || '',
      p.mode, p.reference || '', p.bankName || '', fmt(p.amount), p.notes || '',
    ]);
    rows.push(['', 'TOTAL', '', '', '', '', '', fmt(payments.reduce((s,p) => s + p.amount, 0)), '']);

    const xlsx = await tryXlsx();
    if (xlsx) {
      const wb  = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([HEADERS, ...rows]), 'Payments');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.set({
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Payments_${fy || 'export'}.xlsx"`,
      });
      return res.send(buf);
    }

    const csv = toCsv(HEADERS, rows);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="Payments_${fy || 'export'}.csv"` });
    return res.send(csv);
  } catch (err) { next(err); }
};

module.exports = { exportSalesRegister, exportOutstanding, exportPayments };
