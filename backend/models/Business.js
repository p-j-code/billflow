const mongoose = require('mongoose');

// Indian state codes
const STATE_CODES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh (New)',
};

const invoiceSeriesSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['sale', 'purchase', 'credit_note', 'debit_note', 'proforma'],
    required: true,
  },
  prefix: { type: String, default: '' }, // e.g. "HEW/" or ""
  currentNumber: { type: Number, default: 0 },
  financialYear: { type: String }, // "25-26"
  // Format: {prefix}{number}/{fy} → HEW/1/25-26 or 193/25-26
  format: {
    type: String,
    enum: ['NUM_FY', 'PREFIX_NUM_FY', 'PREFIX_NUM'],
    default: 'NUM_FY',
  },
}, { _id: false });

const businessSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Core Details
  name: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: 200,
  },
  legalName: { type: String, trim: true }, // If different from trade name
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'],
  },
  pan: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'],
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
      enum: Object.keys(STATE_CODES),
    },
  },
  // Contact
  mobile: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  website: { type: String, trim: true },
  // Business Type
  businessType: {
    type: String,
    enum: ['proprietorship', 'partnership', 'pvt_ltd', 'ltd', 'llp', 'huf', 'trust', 'other'],
    default: 'proprietorship',
  },
  industry: {
    type: String,
    enum: ['textile_embroidery', 'jewellery', 'retail', 'manufacturing', 'services', 'trading', 'other'],
    default: 'other',
  },
  // Bank Details (for invoice footer)
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    branch: { type: String, trim: true },
    accountType: { type: String, enum: ['savings', 'current'], default: 'current' },
    upiId: { type: String, trim: true },
  },
  // Invoice Settings
  invoiceSeries: [invoiceSeriesSchema],
  invoiceSettings: {
    defaultTaxRate: { type: Number, default: 5 },
    defaultDueDays: { type: Number, default: 30 },
    showLotBatch: { type: Boolean, default: true }, // Textile/embroidery specific
    showHsnOnInvoice: { type: Boolean, default: true },
    termsAndConditions: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  // Custom Invoice Themes
  invoiceThemes: [{
    id:           { type: String, required: true },
    name:         { type: String, required: true },
    baseTemplate: { type: String, enum: ['traditional','modern'], default: 'modern' },
    accentColor:  { type: String, default: '#F59E0B' },
    headerBg:     { type: String, default: '#111827' },
    headerText:   { type: String, default: '#FFFFFF' },
    bodyText:     { type: String, default: '#1F2937' },
    fontFamily:   { type: String, enum: ['default','serif','mono'], default: 'default' },
    isDefault:    { type: Boolean, default: false },
  }],
  // Assets
  logoUrl: { type: String },
  signatureUrl: { type: String },
  // Financial Year
  currentFinancialYear: { type: String, default: () => getCurrentFY() },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Helper: get current financial year string e.g. "25-26"
function getCurrentFY() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  return `${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}

// Initialize default invoice series on create
businessSchema.pre('save', function (next) {
  if (this.isNew && (!this.invoiceSeries || this.invoiceSeries.length === 0)) {
    const fy = getCurrentFY();
    this.invoiceSeries = [
      { type: 'sale', prefix: '', currentNumber: 0, financialYear: fy, format: 'NUM_FY' },
      { type: 'purchase', prefix: 'PUR/', currentNumber: 0, financialYear: fy, format: 'PREFIX_NUM_FY' },
      { type: 'credit_note', prefix: 'CR/', currentNumber: 0, financialYear: fy, format: 'PREFIX_NUM_FY' },
      { type: 'debit_note', prefix: 'DR/', currentNumber: 0, financialYear: fy, format: 'PREFIX_NUM_FY' },
      { type: 'proforma', prefix: 'PRO/', currentNumber: 0, financialYear: fy, format: 'PREFIX_NUM_FY' },
    ];
    this.currentFinancialYear = fy;
  }
  next();
});

// Virtual: state name from code
businessSchema.virtual('stateName').get(function () {
  return STATE_CODES[this.address?.stateCode] || '';
});

businessSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Business', businessSchema);
module.exports.STATE_CODES = STATE_CODES;
module.exports.getCurrentFY = getCurrentFY;
