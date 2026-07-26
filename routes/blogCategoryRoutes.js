const express = require('express');
const {
  getBlogCategories,
  getBlogCategoryBySlug,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} = require('../controllers/blogCategoryController');
const verifyToken = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { requireAnyPermission } = require('../middleware/requirePermission');

const router = express.Router();
// Creating a category is also how the "+ New" quick-add in the post editor works, so anyone
// who can write posts at all can create one; editing/deleting an existing category is more
// consequential and stays reserved for categories.manage.
const CAN_CREATE = requireAnyPermission('categories.manage', 'posts.create', 'posts.edit', 'posts.editOwn');

router.get('/', getBlogCategories);
router.post('/', verifyToken, CAN_CREATE, createBlogCategory);
router.get('/:slug', getBlogCategoryBySlug);
router.put('/:id', verifyToken, requirePermission('categories.manage'), updateBlogCategory);
router.delete('/:id', verifyToken, requirePermission('categories.manage'), deleteBlogCategory);

module.exports = router;
