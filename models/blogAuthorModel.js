const mongoose = require('mongoose');

const blogAuthorSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    photo: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    bio: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    active: { type: Boolean, default: true, index: true },
    // SEO for this author's public bio/archive page (/blogs/author/:slug)
    seoTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlogAuthor', blogAuthorSchema);
