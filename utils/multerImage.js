// utils/multerImage.js
// Cloudinary/multer config for image uploads (offer banners, logos, etc.) — separate from
// utils/multer.js, which is dedicated to raw resume files (pdf/doc/docx).
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');
const path = require('path');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error('Only JPG, PNG, or WEBP images are allowed');
    }
    return {
      folder: 'offers',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      public_id: `offer-${uniqueSuffix}`,
      access_mode: 'public',
    };
  },
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

module.exports = uploadImage;
