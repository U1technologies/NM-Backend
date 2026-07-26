const mongoose = require('mongoose');

const blogRedirectSchema = mongoose.Schema(
  {
    fromPath: { type: String, required: true, unique: true, trim: true },
    toPath: { type: String, required: true, trim: true },
    type: { type: Number, enum: [301, 302], default: 301 },
    isActive: { type: Boolean, default: true, index: true },
    hitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlogRedirect', blogRedirectSchema);
