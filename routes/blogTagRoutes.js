const express = require('express');
const {
  getBlogTags,
  getBlogTagBySlug,
  createBlogTag,
  updateBlogTag,
  deleteBlogTag,
  mergeTag,
} = require('../controllers/blogTagController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { requireAnyPermission } = require('../middleware/requirePermission');

const router = express.Router();
const CAN_CREATE = requireAnyPermission('tags.manage', 'posts.create', 'posts.edit', 'posts.editOwn');

router.get('/', getBlogTags);
router.post('/', verifyToken, CAN_CREATE, createBlogTag);
router.get('/:slug', getBlogTagBySlug);
router.put('/:id', verifyToken, requirePermission('tags.manage'), updateBlogTag);
router.post('/:id/merge', verifyToken, requirePermission('tags.manage'), mergeTag);
router.delete('/:id', verifyToken, requirePermission('tags.manage'), deleteBlogTag);

module.exports = router;
