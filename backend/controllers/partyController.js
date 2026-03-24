const Party = require('../models/Party');
const { AppError } = require('../middleware/errorHandler');

// @GET /api/parties — List parties with filter/search/pagination
const getParties = async (req, res, next) => {
  try {
    const {
      type,       // customer | supplier | both
      search,     // name, gstin, mobile text search
      isActive = true,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const query = { businessId: req.businessId, isActive: isActive === 'true' || isActive === true };

    if (type) query.type = type;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [parties, total] = await Promise.all([
      Party.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Party.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        parties,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @POST /api/parties — Create party
const createParty = async (req, res, next) => {
  try {
    const partyData = { ...req.body, businessId: req.businessId };

    // Auto-resolve state from GSTIN if not provided
    if (partyData.gstin && !partyData.address?.state) {
      const stateCode = partyData.gstin.substring(0, 2);
      if (!partyData.address) partyData.address = {};
      partyData.address.stateCode = stateCode;
    }

    const party = await Party.create(partyData);

    res.status(201).json({
      success: true,
      message: 'Party created successfully.',
      data: { party },
    });
  } catch (error) {
    next(error);
  }
};

// @GET /api/parties/:id — Get single party
const getParty = async (req, res, next) => {
  try {
    const party = await Party.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!party) return next(new AppError('Party not found.', 404));

    res.json({ success: true, data: { party } });
  } catch (error) {
    next(error);
  }
};

// @PUT /api/parties/:id — Update party
const updateParty = async (req, res, next) => {
  try {
    delete req.body.businessId; // Prevent businessId tampering

    const party = await Party.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!party) return next(new AppError('Party not found.', 404));

    res.json({ success: true, message: 'Party updated.', data: { party } });
  } catch (error) {
    next(error);
  }
};

// @DELETE /api/parties/:id — Soft delete
const deleteParty = async (req, res, next) => {
  try {
    const party = await Party.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { isActive: false },
      { new: true }
    );

    if (!party) return next(new AppError('Party not found.', 404));

    res.json({ success: true, message: 'Party deactivated.' });
  } catch (error) {
    next(error);
  }
};

// @GET /api/parties/summary — Count customers vs suppliers
const getPartySummary = async (req, res, next) => {
  try {
    const summary = await Party.aggregate([
      { $match: { businessId: req.businessId, isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 }, totalBalance: { $sum: '$currentBalance' } } },
    ]);

    res.json({ success: true, data: { summary } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getParties, createParty, getParty, updateParty, deleteParty, getPartySummary };
