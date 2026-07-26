const BlogAuthor = require('../models/blogAuthorModel');
const BlogPost = require('../models/blogPostModel');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const { toSlug, uniqueSlug } = require('../utils/slugify');
const logActivity = require('../utils/activityLogger');
const { recordMediaUpload } = require('./blogMediaController');

const AUTHOR_FIELDS = ['name', 'photo', 'jobTitle', 'bio', 'linkedin', 'twitter', 'active', 'seoTitle', 'metaDescription'];

const slugExists = (excludeId) => async (slug) => {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return BlogAuthor.exists(query);
};

// @desc Get all blog authors, each with their published article count
const getBlogAuthors = async (req, res) => {
  try {
    const authors = await BlogAuthor.find().sort({ name: 1 }).lean();
    const counts = await BlogPost.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$author', count: { $sum: 1 } } },
    ]);
    const countByAuthorId = new Map(counts.map((c) => [String(c._id), c.count]));

    const data = authors.map((author) => ({
      ...author,
      articleCount: countByAuthorId.get(String(author._id)) || 0,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get a single author by slug, with their published posts (paginated)
const getBlogAuthorBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const author = await BlogAuthor.findOne({ slug }).lean();
    if (!author) {
      return res.status(404).json({ success: false, message: 'Author not found' });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = { author: author._id, status: 'published' };

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
      data: { author: { ...author, articleCount: total }, posts, pagination: buildPaginationMeta(page, limit, total) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create a new blog author
const createBlogAuthor = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ success: false, message: 'Field "name" is required and missing!' });
    }

    const authorData = {};
    AUTHOR_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) authorData[field] = req.body[field];
    });

    const baseSlug = toSlug(req.body.slug || req.body.name);
    authorData.slug = await uniqueSlug(baseSlug, slugExists());

    const author = await BlogAuthor.create(authorData);
    logActivity({ req, action: 'author.created', targetType: 'BlogAuthor', targetId: author._id, targetLabel: author.name });
    return res.status(201).json({ success: true, message: 'Author created successfully', data: author });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update an existing blog author
const updateBlogAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const author = await BlogAuthor.findById(id);
    if (!author) {
      return res.status(404).json({ success: false, message: 'Author not found' });
    }

    AUTHOR_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) author[field] = req.body[field];
    });

    if (req.body.slug || req.body.name) {
      const baseSlug = toSlug(req.body.slug || req.body.name);
      author.slug = await uniqueSlug(baseSlug, slugExists(author._id));
    }

    await author.save();
    logActivity({ req, action: 'author.updated', targetType: 'BlogAuthor', targetId: author._id, targetLabel: author.name });
    return res.status(200).json({ success: true, message: 'Author updated successfully', data: author });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a blog author — blocked while any post still references it, since
// BlogPost.author is a required field and deleting it would orphan those posts.
const deleteBlogAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const author = await BlogAuthor.findById(id);
    if (!author) {
      return res.status(404).json({ success: false, message: 'Author not found' });
    }

    const postCount = await BlogPost.countDocuments({ author: id });
    if (postCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${author.name}" — ${postCount} post${postCount === 1 ? '' : 's'} still credit this author. Reassign them first.`,
      });
    }

    await author.deleteOne();
    logActivity({ req, action: 'author.deleted', targetType: 'BlogAuthor', targetId: author._id, targetLabel: author.name });
    return res.status(200).json({ success: true, message: 'Author deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Upload an author photo to Cloudinary and return its URL
const uploadBlogAuthorImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    recordMediaUpload({ file: req.file, folder: 'blog-authors', uploadedBy: req.currentUser?._id });
    return res.status(201).json({ success: true, data: { url: req.file.path } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBlogAuthors,
  getBlogAuthorBySlug,
  createBlogAuthor,
  updateBlogAuthor,
  deleteBlogAuthor,
  uploadBlogAuthorImage,
};
