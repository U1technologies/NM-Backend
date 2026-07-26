const express = require('express');
const {
  getBlogAuthors,
  getBlogAuthorBySlug,
  createBlogAuthor,
  updateBlogAuthor,
  deleteBlogAuthor,
  uploadBlogAuthorImage,
} = require('../controllers/blogAuthorController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { requireAnyPermission } = require('../middleware/requirePermission');
const uploadImage = require('../utils/multerBlogImage');

const router = express.Router();
const CAN_CREATE = requireAnyPermission('authors.manage', 'posts.create', 'posts.edit', 'posts.editOwn');

router.get('/', getBlogAuthors);
router.post('/', verifyToken, CAN_CREATE, createBlogAuthor);
router.post('/upload-image', verifyToken, CAN_CREATE, uploadImage.single('image'), uploadBlogAuthorImage);
router.get('/:slug', getBlogAuthorBySlug);
router.put('/:id', verifyToken, requirePermission('authors.manage'), updateBlogAuthor);
router.delete('/:id', verifyToken, requirePermission('authors.manage'), deleteBlogAuthor);

module.exports = router;
