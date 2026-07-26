const express = require('express');
const multer = require('multer');
const {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogPosts,
  getBlogPostBySlug,
  incrementBlogPostViews,
  likeBlogPost,
  uploadBlogImage,
  bulkAction,
  duplicatePost,
  exportPosts,
  importPosts,
} = require('../controllers/blogPostController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { requireAnyPermission } = require('../middleware/requirePermission');
const uploadImage = require('../utils/multerBlogImage');
const { pingLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
const CAN_WRITE = requireAnyPermission('posts.create', 'posts.edit', 'posts.editOwn');
const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// Literal routes must be registered before the `/:slug` catch-all below, or Express would
// match e.g. "/export" as a slug lookup instead of the export handler.
router.get('/export', verifyToken, requirePermission('posts.view'), exportPosts);
router.post('/import', verifyToken, requirePermission('posts.create'), uploadCsv.single('file'), importPosts);
router.post('/bulk', verifyToken, CAN_WRITE, bulkAction);

router.get('/', getBlogPosts);
router.post('/upload-image', verifyToken, CAN_WRITE, uploadImage.single('image'), uploadBlogImage);
router.post('/', verifyToken, requirePermission('posts.create'), createBlogPost);

router.get('/:slug', getBlogPostBySlug);
router.post('/:slug/view', pingLimiter, incrementBlogPostViews);
router.post('/:slug/like', pingLimiter, likeBlogPost);

router.post('/:id/duplicate', verifyToken, requirePermission('posts.create'), duplicatePost);
router.put('/:id', verifyToken, requireAnyPermission('posts.edit', 'posts.editOwn'), updateBlogPost);
router.delete('/:id', verifyToken, requirePermission('posts.delete'), deleteBlogPost);

module.exports = router;
