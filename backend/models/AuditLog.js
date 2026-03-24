const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  userName:   { type: String },

  // What happened
  action: {
    type: String,
    enum: [
      'invoice.created', 'invoice.updated', 'invoice.status_changed', 'invoice.cancelled', 'invoice.voided',
      'invoice.shared', 'invoice.share_revoked',
      'payment.recorded', 'payment.reversed',
      'party.created', 'party.updated', 'party.deleted',
      'note.created', 'note.issued', 'note.converted', 'note.cancelled',
      'business.updated', 'business.logo_uploaded',
      'user.login', 'user.logout', 'user.role_changed',
    ],
    required: true,
  },

  // What resource was affected
  resourceType: { type: String, enum: ['invoice','payment','party','note','business','user'], required: true },
  resourceId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  resourceLabel:{ type: String }, // e.g. "Invoice 193/25-26" or "Party: Meena Arts"

  // Changes (before/after for updates)
  changes: {
    before: { type: mongoose.Schema.Types.Mixed },
    after:  { type: mongoose.Schema.Types.Mixed },
  },

  // Context
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata:  { type: mongoose.Schema.Types.Mixed }, // extra context

}, { timestamps: true });

auditLogSchema.index({ businessId: 1, createdAt: -1 });
auditLogSchema.index({ businessId: 1, resourceType: 1 });
auditLogSchema.index({ businessId: 1, resourceId: 1 });
auditLogSchema.index({ businessId: 1, userId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
