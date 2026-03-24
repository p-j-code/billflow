const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized. Invalid token.' });
  }
};

// Middleware: ensure req.businessId is set (from header or user's active business)
const requireBusiness = async (req, res, next) => {
  const businessId = req.headers['x-business-id'] || req.user?.activeBusiness;

  if (!businessId) {
    return res.status(400).json({ success: false, message: 'No active business selected. Pass x-business-id header.' });
  }

  // Check user owns this business
  const userOwns = req.user.businesses.some(b => b.toString() === businessId.toString());
  if (!userOwns) {
    return res.status(403).json({ success: false, message: 'Access denied to this business.' });
  }

  req.businessId = businessId;
  next();
};

module.exports = { protect, requireBusiness };
