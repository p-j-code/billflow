const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Party   = require('../models/Party');
const { AppError } = require('../middleware/errorHandler');

function fyRange(fy) {
  // "25-26" → Apr 2025 – Mar 2026
  const startYear = 2000 + parseInt(fy.split('-')[0]);
  return {
    from: new Date(`${startYear}-04-01T00:00:00.000Z`),
    to:   new Date(`${startYear + 1}-03-31T23:59:59.999Z`),
  };
}

function currentFY() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  const s = m >= 4 ? y : y - 1;
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`;
}

// ─── SALES REGISTER ───────────────────────────────────────────────────────────
// GET /api/reports/sales-register?from=&to=&type=sale&page=1&limit=50
const salesRegister = async (req, res, next) => {
  try {
    const { from, to, type = 'sale', page = 1, limit = 50, fy } = req.query;
    const range = fy ? fyRange(fy) : null;

    const query = {
      businessId:  req.businessId,
      invoiceType: type,
      status:      { $nin: ['void', 'cancelled'] },
    };
    if (range) {
      query.invoiceDate = { $gte: range.from, $lte: range.to };
    } else if (from || to) {
      query.invoiceDate = {};
      if (from) query.invoiceDate.$gte = new Date(from);
      if (to)   query.invoiceDate.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ invoiceDate: 1 })
        .skip(skip).limit(Number(limit))
        .select('invoiceNo invoiceDate partySnapshot taxType totals status amountPaid balanceDue'),
      Invoice.countDocuments(query),
    ]);

    // Aggregate totals for the full period
    const [agg] = await Invoice.aggregate([
      { $match: query },
      { $group: {
        _id: null,
        totalTaxable: { $sum: '$totals.taxableValue' },
        totalCgst:    { $sum: '$totals.totalCgst' },
        totalSgst:    { $sum: '$totals.totalSgst' },
        totalIgst:    { $sum: '$totals.totalIgst' },
        totalTax:     { $sum: '$totals.totalTax' },
        grandTotal:   { $sum: '$totals.grandTotal' },
        count:        { $sum: 1 },
      }},
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
        summary: agg || { totalTaxable: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalTax: 0, grandTotal: 0, count: 0 },
      },
    });
  } catch (err) { next(err); }
};

// ─── PARTY-WISE OUTSTANDING ───────────────────────────────────────────────────
// GET /api/reports/outstanding?type=customer|supplier
const partyOutstanding = async (req, res, next) => {
  try {
    const { partyType = 'customer' } = req.query;

    // Get all parties of this type
    const parties = await Party.find({
      businessId: req.businessId,
      type: { $in: partyType === 'supplier' ? ['supplier', 'both'] : ['customer', 'both'] },
      isActive: true,
    }).select('name gstin address mobile currentBalance');

    // Aggregate outstanding per party
    const outstanding = await Invoice.aggregate([
      {
        $match: {
          businessId: req.businessId,
          invoiceType: partyType === 'supplier' ? 'purchase' : 'sale',
          status: { $in: ['sent', 'partial', 'overdue'] },
          balanceDue: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$partyId',
          totalOutstanding: { $sum: '$balanceDue' },
          totalInvoiced:    { $sum: '$totals.grandTotal' },
          totalPaid:        { $sum: '$amountPaid' },
          invoiceCount:     { $sum: 1 },
          oldestDue:        { $min: '$dueDate' },
          partyName:        { $first: '$partySnapshot.name' },
        },
      },
      { $sort: { totalOutstanding: -1 } },
    ]);

    // Overdue count per party
    const overdue = await Invoice.aggregate([
      {
        $match: {
          businessId: req.businessId,
          invoiceType: partyType === 'supplier' ? 'purchase' : 'sale',
          status: { $in: ['sent', 'partial'] },
          dueDate: { $lt: new Date() },
          balanceDue: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$partyId',
          overdueAmount: { $sum: '$balanceDue' },
          overdueCount:  { $sum: 1 },
        },
      },
    ]);

    const overdueMap = {};
    overdue.forEach(o => { overdueMap[o._id.toString()] = o; });

    const result = outstanding.map(o => ({
      ...o,
      overdueAmount: overdueMap[o._id.toString()]?.overdueAmount || 0,
      overdueCount:  overdueMap[o._id.toString()]?.overdueCount  || 0,
    }));

    const totalOutstanding = result.reduce((s, r) => s + r.totalOutstanding, 0);
    const totalOverdue     = result.reduce((s, r) => s + r.overdueAmount, 0);

    res.json({
      success: true,
      data: { outstanding: result, summary: { totalOutstanding, totalOverdue, partyCount: result.length } },
    });
  } catch (err) { next(err); }
};

// ─── HSN SUMMARY ─────────────────────────────────────────────────────────────
// GET /api/reports/hsn-summary?from=&to=&fy=
const hsnSummary = async (req, res, next) => {
  try {
    const { from, to, fy } = req.query;
    const range = fy ? fyRange(fy) : null;

    const dateFilter = range
      ? { $gte: range.from, $lte: range.to }
      : from || to
        ? { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) }
        : null;

    const matchStage = {
      businessId:  req.businessId,
      invoiceType: 'sale',
      status:      { $nin: ['void', 'cancelled'] },
    };
    if (dateFilter) matchStage.invoiceDate = dateFilter;

    const summary = await Invoice.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      { $match: { 'items.hsnCode': { $exists: true, $ne: '' } } },
      {
        $group: {
          _id:         '$items.hsnCode',
          description: { $first: '$items.description' },
          totalQty:    { $sum: '$items.qty' },
          taxableValue:{ $sum: '$items.taxableAmt' },
          totalCgst:   { $sum: '$items.cgstAmt' },
          totalSgst:   { $sum: '$items.sgstAmt' },
          totalIgst:   { $sum: '$items.igstAmt' },
          totalTax:    { $sum: { $add: ['$items.cgstAmt', '$items.sgstAmt', '$items.igstAmt'] } },
          gstRate:     { $first: '$items.taxablePct' },
          invoiceCount:{ $addToSet: '$_id' },
        },
      },
      {
        $project: {
          hsnCode:      '$_id',
          description:  1,
          totalQty:     1,
          taxableValue: 1,
          totalCgst:    1,
          totalSgst:    1,
          totalIgst:    1,
          totalTax:     1,
          gstRate:      1,
          invoiceCount: { $size: '$invoiceCount' },
        },
      },
      { $sort: { taxableValue: -1 } },
    ]);

    const grandTotals = summary.reduce((acc, h) => ({
      taxableValue: acc.taxableValue + h.taxableValue,
      totalCgst:    acc.totalCgst    + h.totalCgst,
      totalSgst:    acc.totalSgst    + h.totalSgst,
      totalIgst:    acc.totalIgst    + h.totalIgst,
      totalTax:     acc.totalTax     + h.totalTax,
    }), { taxableValue: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalTax: 0 });

    res.json({ success: true, data: { summary, grandTotals } });
  } catch (err) { next(err); }
};

// ─── MONTHLY REVENUE CHART ────────────────────────────────────────────────────
// GET /api/reports/monthly-revenue?fy=25-26
const monthlyRevenue = async (req, res, next) => {
  try {
    const { fy = currentFY() } = req.query;
    const { from, to } = fyRange(fy);

    const data = await Invoice.aggregate([
      {
        $match: {
          businessId:  req.businessId,
          invoiceType: 'sale',
          status:      { $nin: ['void', 'cancelled'] },
          invoiceDate: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
          },
          revenue:     { $sum: '$totals.grandTotal' },
          taxable:     { $sum: '$totals.taxableValue' },
          tax:         { $sum: '$totals.totalTax' },
          collected:   { $sum: '$amountPaid' },
          outstanding: { $sum: '$balanceDue' },
          count:       { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build 12-month array (Apr–Mar)
    const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    const startYear = 2000 + parseInt(fy.split('-')[0]);

    const monthlyData = MONTHS.map((label, idx) => {
      const calMonth = idx < 9 ? idx + 4 : idx - 8;
      const calYear  = idx < 9 ? startYear : startYear + 1;
      const found    = data.find(d => d._id.month === calMonth && d._id.year === calYear);
      return {
        month: label,
        year:  calYear,
        revenue:     found?.revenue     || 0,
        taxable:     found?.taxable     || 0,
        tax:         found?.tax         || 0,
        collected:   found?.collected   || 0,
        outstanding: found?.outstanding || 0,
        count:       found?.count       || 0,
      };
    });

    const totals = monthlyData.reduce((acc, m) => ({
      revenue:     acc.revenue     + m.revenue,
      collected:   acc.collected   + m.collected,
      outstanding: acc.outstanding + m.outstanding,
      count:       acc.count       + m.count,
    }), { revenue: 0, collected: 0, outstanding: 0, count: 0 });

    res.json({ success: true, data: { monthly: monthlyData, totals, fy } });
  } catch (err) { next(err); }
};

// ─── GSTR-1 JSON EXPORT ───────────────────────────────────────────────────────
// GET /api/reports/gstr1?fy=25-26&month=4
const gstr1Export = async (req, res, next) => {
  try {
    const { fy = currentFY(), month } = req.query;
    const { from, to } = fyRange(fy);

    const dateFilter = month
      ? (() => {
          const calYear  = parseInt(month) >= 4 ? (2000 + parseInt(fy.split('-')[0])) : (2001 + parseInt(fy.split('-')[0]));
          const mFrom    = new Date(`${calYear}-${String(month).padStart(2,'0')}-01`);
          const mTo      = new Date(mFrom); mTo.setMonth(mTo.getMonth() + 1); mTo.setDate(0);
          return { $gte: mFrom, $lte: mTo };
        })()
      : { $gte: from, $lte: to };

    const invoices = await Invoice.find({
      businessId:  req.businessId,
      invoiceType: 'sale',
      status:      { $nin: ['void', 'cancelled', 'draft'] },
      invoiceDate: dateFilter,
    });

    // B2B invoices (party has GSTIN)
    const b2b = invoices
      .filter(inv => inv.partySnapshot?.gstin)
      .map(inv => ({
        ctin:    inv.partySnapshot.gstin,
        inv: [{
          inum:  inv.invoiceNo,
          idt:   new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }),
          val:   inv.totals.grandTotal,
          pos:   inv.partySnapshot.stateCode || '',
          rchrg: 'N',
          itms:  inv.items.map(item => ({
            num:  item.srNo,
            itm_det: {
              txval: item.taxableAmt,
              rt:    item.taxablePct,
              camt:  item.cgstAmt,
              samt:  item.sgstAmt,
              iamt:  item.igstAmt,
            },
          })),
        }],
      }));

    // B2C invoices (no GSTIN)
    const b2c = invoices
      .filter(inv => !inv.partySnapshot?.gstin)
      .map(inv => ({
        pos:  inv.partySnapshot?.stateCode || '',
        typ:  'OE',
        itms: inv.items.map(item => ({
          num:  item.srNo,
          itm_det: {
            txval: item.taxableAmt,
            rt:    item.taxablePct,
            camt:  item.cgstAmt,
            samt:  item.sgstAmt,
            iamt:  item.igstAmt,
          },
        })),
      }));

    // HSN summary
    const hsnAgg = {};
    invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!item.hsnCode) return;
        if (!hsnAgg[item.hsnCode]) hsnAgg[item.hsnCode] = { hsn_sc: item.hsnCode, desc: item.description, uqc: item.unit || 'OTH', qty: 0, txval: 0, rt: item.taxablePct, camt: 0, samt: 0, iamt: 0 };
        hsnAgg[item.hsnCode].qty   += item.qty;
        hsnAgg[item.hsnCode].txval += item.taxableAmt;
        hsnAgg[item.hsnCode].camt  += item.cgstAmt;
        hsnAgg[item.hsnCode].samt  += item.sgstAmt;
        hsnAgg[item.hsnCode].iamt  += item.igstAmt;
      });
    });

    const gstr1 = {
      gstin: null, // filled by frontend from business profile
      fp:    month ? `${String(month).padStart(2,'0')}${fy.split('-')[0].length === 2 ? '20' + fy.split('-')[0] : fy.split('-')[0]}` : fy,
      b2b,
      b2cs: b2c,
      hsn:  { data: Object.values(hsnAgg) },
      _meta: {
        generatedAt:   new Date().toISOString(),
        invoiceCount:  invoices.length,
        b2bCount:      b2b.length,
        b2cCount:      b2c.length,
        totalTaxable:  invoices.reduce((s, i) => s + i.totals.taxableValue, 0),
        totalTax:      invoices.reduce((s, i) => s + i.totals.totalTax, 0),
        grandTotal:    invoices.reduce((s, i) => s + i.totals.grandTotal, 0),
      },
    };

    // Return JSON file download
    res.set({
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="GSTR1_${fy}${month ? '_M' + month : ''}.json"`,
    });
    res.send(JSON.stringify(gstr1, null, 2));
  } catch (err) { next(err); }
};

// ─── DASHBOARD SUMMARY (updated with real data) ───────────────────────────────
const fullSummary = async (req, res, next) => {
  try {
    const fy = currentFY();
    const { from, to } = fyRange(fy);

    const [invoiceStats, partyStats, revenueStats, paymentStats] = await Promise.all([
      Invoice.aggregate([
        { $match: { businessId: req.businessId, invoiceType: 'sale', status: { $nin: ['void','cancelled'] } } },
        { $facet: {
          thisMonth: [
            { $match: { invoiceDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totals.grandTotal' } } },
          ],
          outstanding: [
            { $match: { status: { $in: ['sent','partial','overdue'] }, balanceDue: { $gt: 0 } } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$balanceDue' } } },
          ],
          overdue: [
            { $match: { status: { $in: ['sent','partial'] }, dueDate: { $lt: new Date() }, balanceDue: { $gt: 0 } } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$balanceDue' } } },
          ],
        }},
      ]),
      Invoice.aggregate([
        { $match: { businessId: req.businessId, invoiceDate: { $gte: from, $lte: to }, invoiceType: 'sale', status: { $nin: ['void','cancelled'] } } },
        { $group: { _id: null, revenue: { $sum: '$totals.grandTotal' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { businessId: req.businessId, invoiceType: 'sale', invoiceDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }, status: { $nin: ['void','cancelled'] } } },
        { $group: { _id: null, revenue: { $sum: '$totals.grandTotal' } } },
      ]),
      Payment.aggregate([
        { $match: { businessId: req.businessId } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const s = invoiceStats[0] || {};

    res.json({
      success: true,
      data: {
        invoices: {
          thisMonth:   { count: s.thisMonth?.[0]?.count || 0,   total: s.thisMonth?.[0]?.total   || 0 },
          outstanding: { count: s.outstanding?.[0]?.count || 0, total: s.outstanding?.[0]?.total || 0 },
          overdue:     { count: s.overdue?.[0]?.count || 0,     total: s.overdue?.[0]?.total     || 0 },
        },
        revenue: {
          thisYear:  partyStats[0]?.revenue  || 0,
          lastMonth: revenueStats[0]?.revenue || 0,
        },
        payments: paymentStats[0] || { total: 0, count: 0 },
      },
    });
  } catch (err) { next(err); }
};

module.exports = { salesRegister, partyOutstanding, hsnSummary, monthlyRevenue, gstr1Export, fullSummary };
