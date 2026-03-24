const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

// @POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, mobile } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered.', 400));
    }

    const user = await User.create({ name, email, password, mobile });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store hashed refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// @POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Email and password are required.', 400));
    }

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Account has been deactivated. Contact support.', 403));
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Populate businesses for context switching
    await user.populate('businesses', 'name gstin address.state logoUrl');
    await user.populate('activeBusiness', 'name gstin address.state logoUrl');

    res.json({
      success: true,
      message: 'Login successful.',
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// @POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError('Refresh token is required.', 400));
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return next(new AppError('Invalid or expired refresh token.', 401));
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Refresh token expired. Please login again.', 401));
    }
    next(error);
  }
};

// @POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// @GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('businesses', 'name gstin address.state logoUrl isActive')
      .populate('activeBusiness', 'name gstin address.state logoUrl invoiceSettings');

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// @PATCH /api/auth/switch-business
const switchBusiness = async (req, res, next) => {
  try {
    const { businessId } = req.body;
    const user = await User.findById(req.user._id);

    const owns = user.businesses.some(b => b.toString() === businessId);
    if (!owns) {
      return next(new AppError('You do not have access to this business.', 403));
    }

    user.activeBusiness = businessId;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Active business switched.', data: { activeBusiness: businessId } });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refresh, logout, getMe, switchBusiness };
