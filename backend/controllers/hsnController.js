const HsnMaster = require('../models/HsnMaster');
const { AppError } = require('../middleware/errorHandler');

// @GET /api/hsn — Search HSN/SAC codes
const searchHsn = async (req, res, next) => {
  try {
    const { q, type, gstRate, limit = 20, page = 1 } = req.query;

    // Query: global codes + business-specific custom codes
    const query = {
      isActive: true,
      $or: [
        { businessId: null },
        { businessId: req.businessId || null },
      ],
    };

    if (q) {
      query.$and = [{
        $or: [
          { code: { $regex: `^${q}`, $options: 'i' } }, // starts with (code search)
          { description: { $regex: q, $options: 'i' } }, // contains (description search)
        ],
      }];
    }

    if (type) query.type = type;
    if (gstRate) query.gstRate = Number(gstRate);

    const skip = (Number(page) - 1) * Number(limit);

    const [codes, total] = await Promise.all([
      HsnMaster.find(query)
        .sort({ code: 1 })
        .skip(skip)
        .limit(Number(limit))
        .select('code description type gstRate cgstRate sgstRate igstRate category'),
      HsnMaster.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        codes,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @GET /api/hsn/:code — Get single HSN code details
const getHsnByCode = async (req, res, next) => {
  try {
    const code = await HsnMaster.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true,
    });

    if (!code) return next(new AppError(`HSN code ${req.params.code} not found.`, 404));

    res.json({ success: true, data: { code } });
  } catch (error) {
    next(error);
  }
};

// @POST /api/hsn — Add custom HSN code for business
const addCustomHsn = async (req, res, next) => {
  try {
    const hsnData = {
      ...req.body,
      businessId: req.businessId,
      isCustom: true,
    };

    const code = await HsnMaster.create(hsnData);

    res.status(201).json({
      success: true,
      message: 'Custom HSN code added.',
      data: { code },
    });
  } catch (error) {
    next(error);
  }
};

// @GET /api/hsn/rates — Get all distinct GST rates
const getGstRates = async (req, res, next) => {
  try {
    const rates = await HsnMaster.distinct('gstRate', { isActive: true });
    res.json({ success: true, data: { rates: rates.sort((a, b) => a - b) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { searchHsn, getHsnByCode, addCustomHsn, getGstRates };
