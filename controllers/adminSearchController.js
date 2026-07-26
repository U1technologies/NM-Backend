const BlogPost = require('../models/blogPostModel');
const BlogCategory = require('../models/blogCategoryModel');
const BlogTag = require('../models/blogTagModel');
const BlogAuthor = require('../models/blogAuthorModel');
const BlogComment = require('../models/blogCommentModel');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc Search across posts, categories, tags, authors, and comments in one call — backs the
// admin panel's global Cmd+K search.
const adminSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(200).json({ success: true, data: { posts: [], categories: [], tags: [], authors: [], comments: [] } });
    }
    const regex = new RegExp(escapeRegex(q), 'i');

    const [posts, categories, tags, authors, comments] = await Promise.all([
      BlogPost.find({ $or: [{ title: regex }, { slug: regex }] }).select('title slug status').limit(8),
      BlogCategory.find({ name: regex }).select('name slug').limit(5),
      BlogTag.find({ name: regex }).select('name slug').limit(5),
      BlogAuthor.find({ name: regex }).select('name slug').limit(5),
      BlogComment.find({ $or: [{ content: regex }, { name: regex }, { email: regex }] })
        .select('content name email post status')
        .populate('post', 'title slug')
        .limit(5),
    ]);

    return res.status(200).json({ success: true, data: { posts, categories, tags, authors, comments } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { adminSearch };
