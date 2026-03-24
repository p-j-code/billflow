const mongoose = require('mongoose');

/**
 * CreditNote / DebitNote / Proforma
 * These reference an original Invoice (for CN/DN) or stand alone (Proforma)
 *
 * Credit Note  → issued by seller to buyer (reduce amount, returns, over-billing)
 * Debit Note   → issued by buyer to seller (increase amount, under-billing)
 * Proforma     → pre-sale estimate, no GST liability, convertible to Tax Invoice
 */

const lineItemSchema = new mongoose.Schema({
  srNo:        { type: Number },
  description: { type: String, required: true, trim: true },
  hsnCode:     { type: String, trim: true },
  lot:         { type: String, trim: true },
  qty:         { type: Number, required: true, min: 0 },
  unit:        { type: String, trim: true, default: 'PCS' },
  rate:        { type: Number, required: true, min: 0 },
  discountPct: { type: Number, default: 0 },
  discountAmt: { type: Number, default: 0 },
  taxablePct:  { type: Number, default: 0 },
  taxableAmt:  { type: Number, default: 0 },
  cgstPct:     { type: Number, default: 0 },
  cgstAmt:     { type: Number, default: 0 },
  sgstPct:     { type: Number, default: 0 },
  sgstAmt:     { type: Number, default: 0 },
  igstPct:     { type: Number, default: 0 },
  igstAmt:     { type: Number, default: 0 },
  totalAmt:    { type: Number, default: 0 },
}, { _id: false });

const noteSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true,
  },

  // Link to original invoice (optional for proforma)
  originalInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null,
  },
  originalInvoiceNo: { type: String, trim: true },

  // Document type + number
  noteType: {
    type: String,
    enum: ['credit_note', 'debit_note', 'proforma'],
    required: true,
  },
  noteNo:   { type: String, required: true, trim: true },
  status:   {
    type: String,
    enum: ['draft', 'issued', 'converted', 'cancelled'],
    default: 'draft',
  },

  // Dates
  noteDate:   { type: Date, required: true, default: Date.now },
  validUntil: { type: Date },  // for proforma

  // Reason (mandatory for CN/DN)
  reason: {
    type: String,
    enum: ['sales_return', 'purchase_return', 'rate_difference', 'discount',
           'damage', 'quality_issue', 'overbilling', 'underbilling', 'other'],
    default: 'other',
  },
  reasonDescription: { type: String, trim: true },

  // Party snapshot
  partySnapshot: {
    name: String, gstin: String, address: String,
    state: String, stateCode: String, mobile: String,
  },

  // GST
  taxType: {
    type: String,
    enum: ['intra', 'inter', 'exempt'],
    default: 'intra',
  },

  // Line items + totals (same structure as Invoice)
  items: [lineItemSchema],
  totals: {
    subtotal:        { type: Number, default: 0 },
    totalDiscount:   { type: Number, default: 0 },
    taxableValue:    { type: Number, default: 0 },
    totalCgst:       { type: Number, default: 0 },
    totalSgst:       { type: Number, default: 0 },
    totalIgst:       { type: Number, default: 0 },
    totalTax:        { type: Number, default: 0 },
    roundOff:        { type: Number, default: 0 },
    grandTotal:      { type: Number, default: 0 },
    grandTotalWords: { type: String },
    totalQty:        { type: Number, default: 0 },
  },

  pdfTheme:           { type: String, enum: ['traditional', 'modern'], default: 'traditional' },
  notes:              { type: String, trim: true },
  termsAndConditions: { type: String, trim: true },
  financialYear:      { type: String },

  // For proforma → invoice conversion
  convertedToInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  convertedAt:          { type: Date },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

noteSchema.index({ businessId: 1, noteNo: 1 }, { unique: true });
noteSchema.index({ businessId: 1, noteType: 1, noteDate: -1 });
noteSchema.index({ businessId: 1, partyId: 1 });

module.exports = mongoose.model('Note', noteSchema);
