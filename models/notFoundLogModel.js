const mongoose = require('mongoose');

// One row per distinct 404'd path — count/lastSeenAt accumulate rather than logging every
// individual hit, so a broken link that gets crawled repeatedly doesn't flood the collection.
const notFoundLogSchema = mongoose.Schema(
  {
    path: { type: String, required: true, unique: true, trim: true },
    referrer: { type: String, default: '' },
    count: { type: Number, default: 1 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotFoundLog', notFoundLogSchema);
