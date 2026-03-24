const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// Business membership — user can have different roles in different businesses
const businessMembershipSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  role: {
    type: String,
    enum: ['owner', 'accountant', 'staff', 'viewer'],
    default: 'owner',
  },
  // Granular permissions override (optional)
  permissions: {
    canCreateInvoice:  { type: Boolean, default: true  },
    canEditInvoice:    { type: Boolean, default: true  },
    canDeleteInvoice:  { type: Boolean, default: false },
    canViewReports:    { type: Boolean, default: true  },
    canExportData:     { type: Boolean, default: true  },
    canManageParties:  { type: Boolean, default: true  },
    canManageBusiness: { type: Boolean, default: false },
    canManageUsers:    { type: Boolean, default: false },
  },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joinedAt:  { type: Date, default: Date.now },
}, { _id: false });

const ROLE_DEFAULTS = {
  owner:      { canCreateInvoice:true,  canEditInvoice:true,  canDeleteInvoice:true,  canViewReports:true,  canExportData:true,  canManageParties:true,  canManageBusiness:true,  canManageUsers:true  },
  accountant: { canCreateInvoice:true,  canEditInvoice:true,  canDeleteInvoice:false, canViewReports:true,  canExportData:true,  canManageParties:true,  canManageBusiness:false, canManageUsers:false },
  staff:      { canCreateInvoice:true,  canEditInvoice:false, canDeleteInvoice:false, canViewReports:false, canExportData:false, canManageParties:true,  canManageBusiness:false, canManageUsers:false },
  viewer:     { canCreateInvoice:false, canEditInvoice:false, canDeleteInvoice:false, canViewReports:true,  canExportData:false, canManageParties:false, canManageBusiness:false, canManageUsers:false },
};

const userSchema = new mongoose.Schema({
  name:   { type: String, required: [true,'Name is required'], trim: true, maxlength: 100 },
  email:  { type: String, required: [true,'Email is required'], unique: true, lowercase: true, trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'] },
  password: { type: String, required: [true,'Password is required'], minlength: 8, select: false },
  mobile:   { type: String, trim: true },

  // Business memberships (with roles)
  memberships: [businessMembershipSchema],

  // Active business context
  activeBusiness: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },

  // Legacy (backward compat)
  businesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],

  refreshToken: { type: String, select: false },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

// Get user's role + effective permissions for a specific business
userSchema.methods.getRoleForBusiness = function(businessId) {
  const membership = this.memberships?.find(m => m.businessId.toString() === businessId.toString());
  if (!membership) {
    // Fallback: if they own this business (legacy), they're owner
    const isOwner = this.businesses?.some(b => b.toString() === businessId.toString());
    return isOwner ? { role: 'owner', permissions: ROLE_DEFAULTS.owner } : null;
  }
  return {
    role: membership.role,
    permissions: { ...ROLE_DEFAULTS[membership.role], ...membership.permissions },
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLE_DEFAULTS = ROLE_DEFAULTS;
