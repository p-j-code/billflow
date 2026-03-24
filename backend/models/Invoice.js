// ADD these fields to the invoiceSchema in backend/models/Invoice.js
// Inside the main schema definition, add after the `createdBy` field:

/*
  // ── Share Token (for public WhatsApp link) ──
  shareToken:        { type: String, index: true, sparse: true },
  shareTokenExpiry:  { type: Date },
*/

// The full updated Invoice.js is provided below as the complete replacement:

const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  srNo:        { type: Number },
  description: { type: String, required: true, trim: true },
  hsnCode:     { type: String, trim: true },
  lot:         { type: String, trim: true },
  qty:         { type: Number, required: true, min: 0 },
  unit:        { type: String, trim: true, default: 'PCS' },
  rate:        { type: Number, required: true, min: 0 },
  discountPct: { type: Number, default: 0, min: 0, max: 100 },
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

const totalsSchema = new mongoose.Schema({
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
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  businessId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  partyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  invoiceNo:   { type: String, required: true, trim: true },
  invoiceType: { type: String, enum: ['sale','purchase','credit_note','debit_note','proforma'], default: 'sale' },
  status:      { type: String, enum: ['draft','sent','paid','partial','overdue','cancelled','void'], default: 'draft' },
  invoiceDate: { type: Date, required: true, default: Date.now },
  dueDate:     { type: Date },
  supplyDate:  { type: Date },
  transport:   { type: String, trim: true },
  vehicleNo:   { type: String, trim: true },
  placeOfSupply: { type: String, trim: true },
  poNumber:    { type: String, trim: true },
  refNumber:   { type: String, trim: true },
  partySnapshot: {
    name: String, gstin: String, address: String,
    state: String, stateCode: String, mobile: String, email: String,
  },
  taxType:   { type: String, enum: ['intra','inter','exempt','composition'], default: 'intra' },
  items:     [lineItemSchema],
  totals:    { type: totalsSchema, default: () => ({}) },
  invoiceDiscountPct: { type: Number, default: 0 },
  invoiceDiscountAmt: { type: Number, default: 0 },
  amountPaid:  { type: Number, default: 0 },
  balanceDue:  { type: Number, default: 0 },
  pdfTheme:       { type: String, default: 'traditional' }, // base template key or 'traditional'/'modern'
  pdfThemeId:     { type: String, default: null },           // custom theme UUID (from business.invoiceThemes)
  pdfThemeConfig: { type: mongoose.Schema.Types.Mixed, default: null }, // snapshot of custom theme at save time
  pdfUrl:      { type: String },
  notes:             { type: String, trim: true },
  termsAndConditions:{ type: String, trim: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancelReason:{ type: String },
  financialYear: { type: String },
  // ── Share token for public WhatsApp link ──
  shareToken:       { type: String, index: true, sparse: true },
  shareTokenExpiry: { type: Date },
}, { timestamps: true });

invoiceSchema.index({ businessId: 1, invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ businessId: 1, invoiceDate: -1 });
invoiceSchema.index({ businessId: 1, status: 1 });
invoiceSchema.index({ businessId: 1, partyId: 1 });
invoiceSchema.index({ businessId: 1, invoiceType: 1, invoiceDate: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
