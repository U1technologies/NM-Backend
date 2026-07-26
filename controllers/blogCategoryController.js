const BlogCategory = require('../models/blogCategoryModel');
const BlogPost = require('../models/blogPostModel');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const { toSlug, uniqueSlug } = require('../utils/slugify');
const logActivity = require('../utils/activityLogger');

const CATEGORY_FIELDS = ['name', 'description', 'icon', 'color', 'parentCategory'];

const slugExists = (excludeId) => async (slug) => {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return BlogCategory.exists(query);
};

// @desc Get all blog categories, each with its published post count and total views
// (category analytics) and parent category name (for the hierarchy view)
const getBlogCategories = async (req, res) => {
  try {
    const [categories, counts] = await Promise.all([
      BlogCategory.find().sort({ name: 1 }).populate('parentCategory', 'name slug').lean(),
      BlogPost.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$category', count: { $sum: 1 }, totalViews: { $sum: '$views' } } },
      ]),
    ]);
    const statsByCategoryId = new Map(counts.map((c) => [String(c._id), c]));

    const data = categories.map((category) => ({
      ...category,
      postCount: statsByCategoryId.get(String(category._id))?.count || 0,
      totalViews: statsByCategoryId.get(String(category._id))?.totalViews || 0,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get a single category by slug, with its published posts (paginated)
const getBlogCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await BlogCategory.findOne({ slug });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = { category: category._id, status: 'published' };

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .select('-content -searchText -faqs')
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .populate('author', 'name slug photo jobTitle')
        .sort({ publishDate: -1 })
        .skip(skip)
        .limit(limit),
      BlogPost.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { category, posts, pagination: buildPaginationMeta(page, limit, total) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create a new blog category
const createBlogCategory = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ success: false, message: 'Field "name" is required and missing!' });
    }

    const categoryData = {};
    CATEGORY_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) categoryData[field] = req.body[field];
    });

    const baseSlug = toSlug(req.body.slug || req.body.name);
    categoryData.slug = await uniqueSlug(baseSlug, slugExists());

    const category = await BlogCategory.create(categoryData);
    logActivity({ req, action: 'category.created', targetType: 'BlogCategory', targetId: category._id, targetLabel: category.name });
    return res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update an existing blog category
const updateBlogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await BlogCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (req.body.parentCategory && req.body.parentCategory === String(category._id)) {
      return res.status(400).json({ success: false, message: 'A category cannot be its own parent' });
    }

    CATEGORY_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) category[field] = req.body[field];
    });

    if (req.body.slug || req.body.name) {
      const baseSlug = toSlug(req.body.slug || req.body.name);
      category.slug = await uniqueSlug(baseSlug, slugExists(category._id));
    }

    await category.save();
    logActivity({ req, action: 'category.updated', targetType: 'BlogCategory', targetId: category._id, targetLabel: category.name });
    return res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a blog category — blocked while any post still references it, since
// BlogPost.category is a required field and deleting it would orphan those posts.
const deleteBlogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await BlogCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const postCount = await BlogPost.countDocuments({ category: id });
    if (postCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${category.name}" — ${postCount} post${postCount === 1 ? '' : 's'} still use this category. Reassign them first.`,
      });
    }

    await category.deleteOne();
    logActivity({ req, action: 'category.deleted', targetType: 'BlogCategory', targetId: category._id, targetLabel: category.name });
    return res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBlogCategories,
  getBlogCategoryBySlug,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
};
