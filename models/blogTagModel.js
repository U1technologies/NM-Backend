const mongoose = require('mongoose');

const blogTagSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlogTag', blogTagSchema);
