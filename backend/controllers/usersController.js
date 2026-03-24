const User    = require('../models/User');
const Business= require('../models/Business');
const { AppError } = require('../middleware/errorHandler');
const { audit }    = require('../middleware/auditMiddleware');

const ROLE_DEFAULTS = User.ROLE_DEFAULTS || {
  owner:      { canCreateInvoice:true,  canEditInvoice:true,  canDeleteInvoice:true,  canViewReports:true,  canExportData:true,  canManageParties:true,  canManageBusiness:true,  canManageUsers:true  },
  accountant: { canCreateInvoice:true,  canEditInvoice:true,  canDeleteInvoice:false, canViewReports:true,  canExportData:true,  canManageParties:true,  canManageBusiness:false, canManageUsers:false },
  staff:      { canCreateInvoice:true,  canEditInvoice:false, canDeleteInvoice:false, canViewReports:false, canExportData:false, canManageParties:true,  canManageBusiness:false, canManageUsers:false },
  viewer:     { canCreateInvoice:false, canEditInvoice:false, canDeleteInvoice:false, canViewReports:true,  canExportData:false, canManageParties:false, canManageBusiness:false, canManageUsers:false },
};

// GET /api/users — list all members of this business
const listUsers = async (req, res, next) => {
  try {
    const business = await Business.findById(req.businessId);
    if (!business) return next(new AppError('Business not found.', 404));

    // Find all users who are members of this business
    const members = await User.find({
      $or: [
        { 'memberships.businessId': req.businessId },
        { businesses: req.businessId },           // legacy
      ],
    }).select('name email mobile memberships businesses createdAt');

    const result = members.map(u => {
      const membership = u.memberships?.find(m => m.businessId.toString() === req.businessId.toString());
      const isOwner    = u.businesses?.some(b => b.toString() === req.businessId.toString());
      return {
        _id:       u._id,
        name:      u.name,
        email:     u.email,
        mobile:    u.mobile,
        role:      membership?.role || (isOwner ? 'owner' : 'viewer'),
        joinedAt:  membership?.joinedAt || u.createdAt,
        isCurrentUser: u._id.toString() === req.user._id.toString(),
      };
    });

    res.json({ success: true, data: { users: result } });
  } catch (err) { next(err); }
};

// POST /api/users/invite — invite user by email
const inviteUser = async (req, res, next) => {
  try {
    const { email, role = 'accountant' } = req.body;
    if (!email) return next(new AppError('Email is required.', 400));
    if (!['accountant', 'staff', 'viewer'].includes(role))
      return next(new AppError('Invalid role. Must be: accountant, staff, or viewer.', 400));

    // Check if user exists
    let invitee = await User.findOne({ email: email.toLowerCase() });
    if (!invitee) {
      return next(new AppError(`No BillFlow account found for ${email}. They must register first.`, 404));
    }

    // Check if already a member
    const alreadyMember = invitee.memberships?.some(m => m.businessId.toString() === req.businessId.toString())
      || invitee.businesses?.some(b => b.toString() === req.businessId.toString());

    if (alreadyMember) {
      return next(new AppError(`${email} is already a member of this business.`, 400));
    }

    // Add membership
    if (!invitee.memberships) invitee.memberships = [];
    invitee.memberships.push({
      businessId: req.businessId,
      role,
      invitedBy: req.user._id,
      joinedAt:  new Date(),
    });

    // Also add to legacy businesses array
    if (!invitee.businesses) invitee.businesses = [];
    invitee.businesses.push(req.businessId);
    await invitee.save();

    const business = await Business.findById(req.businessId);
    await audit(req, 'user.role_changed', 'user', invitee._id,
      `User: ${invitee.name}`, { after: { role, businessId: req.businessId } });

    res.status(201).json({
      success: true,
      message: `${invitee.name} (${email}) added as ${role}.`,
      data: { user: { _id: invitee._id, name: invitee.name, email: invitee.email, role } },
    });
  } catch (err) { next(err); }
};

// PATCH /api/users/:userId/role — change a member's role
const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['accountant', 'staff', 'viewer', 'owner'].includes(role))
      return next(new AppError('Invalid role.', 400));

    const target = await User.findById(req.params.userId);
    if (!target) return next(new AppError('User not found.', 404));

    // Can't change own role
    if (target._id.toString() === req.user._id.toString())
      return next(new AppError('Cannot change your own role.', 400));

    // Update membership
    const membership = target.memberships?.find(m => m.businessId.toString() === req.businessId.toString());
    if (membership) {
      membership.role = role;
    } else {
      if (!target.memberships) target.memberships = [];
      target.memberships.push({ businessId: req.businessId, role, joinedAt: new Date() });
    }
    await target.save();

    await audit(req, 'user.role_changed', 'user', target._id, `User: ${target.name}`,
      { after: { role } });

    res.json({ success: true, message: `${target.name}'s role updated to ${role}.` });
  } catch (err) { next(err); }
};

// DELETE /api/users/:userId — remove member from business
const removeMember = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return next(new AppError('User not found.', 404));
    if (target._id.toString() === req.user._id.toString())
      return next(new AppError('Cannot remove yourself.', 400));

    target.memberships = (target.memberships || []).filter(
      m => m.businessId.toString() !== req.businessId.toString()
    );
    target.businesses = (target.businesses || []).filter(
      b => b.toString() !== req.businessId.toString()
    );
    await target.save();

    res.json({ success: true, message: `${target.name} removed from business.` });
  } catch (err) { next(err); }
};

// GET /api/users/roles — get role definitions
const getRoles = (req, res) => {
  res.json({
    success: true,
    data: {
      roles: Object.entries(ROLE_DEFAULTS).map(([role, permissions]) => ({
        role,
        label: role.charAt(0).toUpperCase() + role.slice(1),
        permissions,
        description: {
          owner:      'Full access — can manage everything including users and business settings',
          accountant: 'Can create/edit invoices, manage parties, view reports and export data',
          staff:      'Can create invoices and manage parties only',
          viewer:     'Read-only access to reports and invoices',
        }[role],
      })),
    },
  });
};

module.exports = { listUsers, inviteUser, changeRole, removeMember, getRoles };
