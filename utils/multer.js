// // utils/multer.js
// const multer = require('multer');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const cloudinary = require('./cloudinary');

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'resumes',
//     resource_type: 'raw', // To allow PDF, DOC, DOCX
//     allowed_formats: ['pdf', 'doc', 'docx'],
//   },
// });

// const upload = multer({ 
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
// });

// module.exports = upload;

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');
const path = require('path');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.pdf', '.doc', '.docx'];
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('Only PDF, DOC, or DOCX files are allowed');
      }
      return {
        folder: 'resumes',
        resource_type: 'raw', // Explicitly use raw for non-media files
        allowed_formats: ['pdf', 'doc', 'docx'],
        public_id: `resume-${uniqueSuffix}${fileExtension}`,
        access_mode: 'public',
      };
    } catch (error) {
      throw new Error(`Cloudinary configuration error: ${error.message}`);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only PDF, DOC, or DOCX files are allowed'));
    }
    cb(null, true);
  },
});

module.exports = upload;
