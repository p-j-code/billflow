const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true,
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true,
    index: true,
  },
  // Payment details
  amount:     { type: Number, required: true, min: 0.01 },
  mode: {
    type: String,
    enum: ['cash', 'upi', 'neft', 'rtgs', 'cheque', 'credit'],
    required: true,
    default: 'cash',
  },
  paymentDate: { type: Date, required: true, default: Date.now },
  reference:   { type: String, trim: true },  // UPI txn ID / cheque no / NEFT UTR
  bankName:    { type: String, trim: true },  // for cheque / NEFT
  notes:       { type: String, trim: true },

  // Snapshot at time of payment
  invoiceNo:   { type: String },
  partyName:   { type: String },

  financialYear: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

paymentSchema.index({ businessId: 1, paymentDate: -1 });
paymentSchema.index({ businessId: 1, partyId: 1 });
paymentSchema.index({ businessId: 1, invoiceId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
