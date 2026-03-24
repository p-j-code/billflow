const mongoose = require('mongoose');
const { STATE_CODES } = require('./Business');

const partySchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  // Party Type
  type: {
    type: String,
    enum: ['customer', 'supplier', 'both'],
    required: [true, 'Party type is required'],
  },
  // Core Details
  name: {
    type: String,
    required: [true, 'Party name is required'],
    trim: true,
    maxlength: 200,
  },
  displayName: { type: String, trim: true }, // Short name for dropdowns
  // GST Details
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'],
    default: null,
  },
  pan: {
    type: String,
    trim: true,
    uppercase: true,
  },
  // Address
  address: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    pincode: { type: String, trim: true },
    state: { type: String, trim: true },
    stateCode: {
      type: String,
      trim: true,
    },
  },
  // Contact
  mobile: { type: String, trim: true },
  alternateMobile: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  contactPerson: { type: String, trim: true },
  // Financial Settings
  creditLimit: { type: Number, default: 0 }, // 0 = no limit
  creditDays: { type: Number, default: 30 },
  openingBalance: { type: Number, default: 0 },
  openingBalanceType: {
    type: String,
    enum: ['debit', 'credit'], // debit = they owe us, credit = we owe them
    default: 'debit',
  },
  // Running balance (updated on each transaction)
  currentBalance: { type: Number, default: 0 },
  currentBalanceType: { type: String, enum: ['debit', 'credit'], default: 'debit' },
  // Tags for segmentation
  tags: [{ type: String, trim: true }],
  notes: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for fast search within a business
partySchema.index({ businessId: 1, name: 1 });
partySchema.index({ businessId: 1, type: 1 });
partySchema.index({ businessId: 1, gstin: 1 });
partySchema.index({ businessId: 1, isActive: 1 });

// Full-text search index
partySchema.index({ name: 'text', displayName: 'text', gstin: 'text', mobile: 'text' });

// Virtual: resolve state name from GSTIN prefix
partySchema.virtual('stateFromGstin').get(function () {
  if (this.gstin && this.gstin.length >= 2) {
    return STATE_CODES[this.gstin.substring(0, 2)] || '';
  }
  return '';
});

// Virtual: state code from GSTIN
partySchema.virtual('stateCodeFromGstin').get(function () {
  if (this.gstin && this.gstin.length >= 2) {
    return this.gstin.substring(0, 2);
  }
  return this.address?.stateCode || '';
});

partySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Party', partySchema);
