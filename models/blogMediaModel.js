const mongoose = require('mongoose');

const blogMediaSchema = mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true, unique: true }, // Cloudinary public_id — needed to delete/transform
    folder: { type: String, default: 'general' }, // matches the Cloudinary folder it was uploaded into
    originalFilename: { type: String, default: '' },
    format: { type: String, default: '' },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    bytes: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlogMedia', blogMediaSchema);
