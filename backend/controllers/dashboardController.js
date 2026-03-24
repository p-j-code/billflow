const Party = require('../models/Party');
const { AppError } = require('../middleware/errorHandler');

// @GET /api/dashboard/summary
// Phase 1: basic party counts + placeholders for invoice stats (Phase 2)
const getSummary = async (req, res, next) => {
  try {
    const businessId = req.businessId;

    const [partySummary] = await Promise.all([
      Party.aggregate([
        { $match: { businessId, isActive: true } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = { customer: 0, supplier: 0, both: 0 };
    partySummary.forEach(p => { counts[p._id] = p.count; });

    res.json({
      success: true,
      data: {
        parties: {
          total: counts.customer + counts.supplier + counts.both,
          customers: counts.customer + counts.both,
          suppliers: counts.supplier + counts.both,
        },
        // Placeholders for Phase 2 (Invoice module)
        invoices: {
          thisMonth: { count: 0, total: 0 },
          outstanding: { count: 0, total: 0 },
          overdue: { count: 0, total: 0 },
        },
        revenue: {
          thisMonth: 0,
          lastMonth: 0,
          thisYear: 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
