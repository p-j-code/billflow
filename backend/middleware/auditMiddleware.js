const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event — call this after any important DB mutation
 */
async function audit(req, action, resourceType, resourceId, resourceLabel, changes = {}, metadata = {}) {
  try {
    await AuditLog.create({
      businessId:    req.businessId || req.user?.activeBusiness,
      userId:        req.user._id,
      userName:      req.user.name,
      action,
      resourceType,
      resourceId,
      resourceLabel,
      changes,
      ipAddress:     req.ip || req.connection?.remoteAddress,
      userAgent:     req.get('user-agent'),
      metadata,
    });
  } catch (err) {
    // Never let audit failure break main flow
    console.warn('Audit log failed:', err.message);
  }
}

module.exports = { audit };
