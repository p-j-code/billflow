const mongoose = require('mongoose');

const hsnMasterSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'HSN/SAC code is required'],
    trim: true,
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['goods', 'service'],
    default: 'goods',
  },
  // GST Rate (percentage) — most common rates
  gstRate: {
    type: Number,
    enum: [0, 0.25, 0.5, 1, 1.5, 3, 5, 6, 7.5, 9, 12, 14, 18, 28],
    required: true,
  },
  // IGST = gstRate, CGST = SGST = gstRate/2
  cgstRate: { type: Number },
  sgstRate: { type: Number },
  igstRate: { type: Number },
  // Category for filtering/grouping
  category: { type: String, trim: true },
  chapter: { type: String, trim: true }, // HSN Chapter (first 2 digits)
  isActive: { type: Boolean, default: true },
  // Global vs business-specific
  isCustom: { type: Boolean, default: false }, // true = user-added
  businessId: { // null = global master, set = business-specific custom code
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    default: null,
  },
}, { timestamps: true });

// Auto-compute CGST/SGST/IGST rates before save
hsnMasterSchema.pre('save', function (next) {
  this.igstRate = this.gstRate;
  this.cgstRate = this.gstRate / 2;
  this.sgstRate = this.gstRate / 2;
  // Chapter = first 2 digits of HSN code
  if (this.code && this.code.length >= 2) {
    this.chapter = this.code.substring(0, 2);
  }
  next();
});

// Compound unique index: code + businessId (null for global)
hsnMasterSchema.index({ code: 1, businessId: 1 }, { unique: true });
// Text search
hsnMasterSchema.index({ code: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('HsnMaster', hsnMasterSchema);
