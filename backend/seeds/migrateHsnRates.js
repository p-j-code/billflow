/**
 * migrateHsnRates.js
 * ──────────────────
 * One-time migration: backfills cgstRate / sgstRate / igstRate / chapter
 * on all HsnMaster documents where these fields are missing.
 *
 * Root cause: the original seed used insertMany() which bypasses Mongoose
 * pre-save middleware, so the auto-computed fields were never set.
 *
 * Run once: node backend/seeds/migrateHsnRates.js
 */

require('dotenv').config();
const mongoose  = require('mongoose');
const HsnMaster = require('../models/HsnMaster');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Running HSN rate backfill…');

  // Use MongoDB aggregation pipeline update — no need to load docs into Node
  const result = await HsnMaster.updateMany(
    {
      $or: [
        { cgstRate: { $exists: false } },
        { cgstRate: null },
        { igstRate: { $exists: false } },
        { igstRate: null },
      ],
    },
    [
      {
        $set: {
          igstRate: '$gstRate',
          cgstRate: { $divide: ['$gstRate', 2] },
          sgstRate: { $divide: ['$gstRate', 2] },
          chapter:  { $substrCP: ['$code', 0, 2] },
        },
      },
    ]
  );

  console.log(`✓ Updated ${result.modifiedCount} HSN/SAC records`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
