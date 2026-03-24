const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');

// GET /api/audit?resourceType=invoice&page=1
const getAuditLogs = async (req, res, next) => {
  try {
    const { resourceType, resourceId, userId, action, page = 1, limit = 30 } = req.query;

    const query = { businessId: req.businessId };
    if (resourceType) query.resourceType = resourceType;
    if (resourceId)   query.resourceId   = resourceId;
    if (userId)       query.userId       = userId;
    if (action)       query.action       = action;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'name email'),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getAuditLogs };
