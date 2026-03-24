const Business = require("../models/Business");
const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");

// @POST /api/business — Create new business
const createBusiness = async (req, res, next) => {
  try {
    const businessData = { ...req.body, ownerId: req.user._id };
    const business = await Business.create(businessData);

    // Link business to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { businesses: business._id },
      $set: { activeBusiness: business._id },
    });

    res.status(201).json({
      success: true,
      message: "Business created successfully.",
      data: { business },
    });
  } catch (error) {
    next(error);
  }
};

// @GET /api/business — List all businesses for user
const getMyBusinesses = async (req, res, next) => {
  try {
    const businesses = await Business.find({
      _id: { $in: req.user.businesses },
      isActive: true,
    }).select(
      "name gstin address.state address.city logoUrl businessType industry invoiceThemes createdAt",
    );

    res.json({ success: true, data: { businesses, count: businesses.length } });
  } catch (error) {
    next(error);
  }
};

// @GET /api/business/:id — Get single business
const getBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({
      _id: req.params.id,
      _id: { $in: req.user.businesses },
    });

    if (!business) {
      return next(new AppError("Business not found.", 404));
    }

    res.json({ success: true, data: { business } });
  } catch (error) {
    next(error);
  }
};

// @PUT /api/business/:id — Update business
const updateBusiness = async (req, res, next) => {
  try {
    // Prevent changing ownerId
    delete req.body.ownerId;

    const business = await Business.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );

    if (!business) {
      return next(new AppError("Business not found or access denied.", 404));
    }

    res.json({
      success: true,
      message: "Business updated.",
      data: { business },
    });
  } catch (error) {
    next(error);
  }
};

// @PATCH /api/business/:id/invoice-series — Update invoice series config
const updateInvoiceSeries = async (req, res, next) => {
  try {
    const { type, prefix, format } = req.body;

    const business = await Business.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!business) return next(new AppError("Business not found.", 404));

    const series = business.invoiceSeries.find((s) => s.type === type);
    if (!series) return next(new AppError("Series type not found.", 404));

    if (prefix !== undefined) series.prefix = prefix;
    if (format !== undefined) series.format = format;

    await business.save();

    res.json({
      success: true,
      message: "Invoice series updated.",
      data: { invoiceSeries: business.invoiceSeries },
    });
  } catch (error) {
    next(error);
  }
};

// @GET /api/business/:id/next-invoice-number — Preview next invoice number
const getNextInvoiceNumber = async (req, res, next) => {
  try {
    const { type = "sale" } = req.query;
    const business = await Business.findOne({
      _id: req.params.id,
      _id: { $in: req.user.businesses },
    });
    if (!business) return next(new AppError("Business not found.", 404));

    const series = business.invoiceSeries.find((s) => s.type === type);
    if (!series) return next(new AppError("Series not configured.", 404));

    const nextNum = series.currentNumber + 1;
    let formatted = "";
    const fy = series.financialYear || business.currentFinancialYear;

    switch (series.format) {
      case "NUM_FY":
        formatted = `${nextNum}/${fy}`;
        break;
      case "PREFIX_NUM_FY":
        formatted = `${series.prefix}${nextNum}/${fy}`;
        break;
      case "PREFIX_NUM":
        formatted = `${series.prefix}${nextNum}`;
        break;
      default:
        formatted = `${nextNum}/${fy}`;
    }

    res.json({
      success: true,
      data: { nextNumber: nextNum, formatted, series },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBusiness,
  getMyBusinesses,
  getBusiness,
  updateBusiness,
  updateInvoiceSeries,
  getNextInvoiceNumber,
};
