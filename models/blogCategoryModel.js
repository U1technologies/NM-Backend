const mongoose = require('mongoose');

const blogCategorySchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' }, // lucide-react icon name, rendered via a name->component map on the frontend
    color: { type: String, default: '' }, // Tailwind-friendly accent, e.g. "blue" | "purple" | "emerald"
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlogCategory', blogCategorySchema);
