const { Parser: CsvParser } = require('json2csv');
const BlogPost = require('../models/blogPostModel');
const BlogCategory = require('../models/blogCategoryModel');
const BlogTag = require('../models/blogTagModel');
const BlogAuthor = require('../models/blogAuthorModel');
const { toSlug, uniqueSlug } = require('../utils/slugify');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const { hasPermission } = require('../middleware/requirePermission');
const logActivity = require('../utils/activityLogger');
const { recordMediaUpload } = require('./blogMediaController');
const { computeSeoScore } = require('../utils/seoScore');
const { scanPostLinks } = require('../utils/linkScanner');
const BlogRevision = require('../models/blogRevisionModel');
const notify = require('../utils/notifier');

const BLOG_POST_FIELDS = [
  'title', 'seoTitle', 'metaDescription', 'canonicalUrl', 'robotsDirective', 'focusKeyword', 'secondaryKeywords',
  'excerpt', 'featuredImage', 'featuredImageAlt', 'bannerImage', 'bannerImageAlt', 'category', 'tags', 'author',
  'content', 'faqs', 'status', 'featured', 'pinned', 'trending', 'difficulty', 'publishDate', 'relatedPostIds',
];

// Mirrors the enum in models/blogPostModel.js — kept as an explicit list (rather than reading
// the schema path) so it's obvious at a glance which values the admin filter/status UI expects.
const ALL_STATUSES = ['draft', 'in-progress', 'review', 'needs-revision', 'approved', 'scheduled', 'published', 'archived', 'rejected'];

// A 'scheduled' post whose publishDate has arrived should start showing publicly without
// anyone manually flipping its status — there's no cron/job runner in this app, so this runs
// as a cheap lazy check on every read instead. Fine at this app's post volume; would need a
// real scheduled job if the catalog grows into the tens of thousands.
const promoteDueScheduledPosts = async () => {
  const result = await BlogPost.updateMany({ status: 'scheduled', publishDate: { $lte: new Date() } }, { $set: { status: 'published' } });
  if (result.modifiedCount > 0) {
    logActivity({ req: {}, action: 'system.scheduled_posts_published', metadata: { count: result.modifiedCount } });
  }
  return result;
};

const POPULATE_CATEGORY = 'name slug icon color';
const POPULATE_TAG = 'name slug';
const POPULATE_AUTHOR = 'name slug photo jobTitle bio linkedin twitter';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugExists = (excludeId) => async (slug) => {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return BlogPost.exists(query);
};

const SORTS = {
  newest: { publishDate: -1 },
  oldest: { publishDate: 1 },
  popular: { views: -1 },
  trending: { views: -1 },
  readingTime: { readingTime: 1 },
};

// @desc Create a new blog post
const createBlogPost = async (req, res) => {
  try {
    const requiredFields = {
      title: req.body.title,
      excerpt: req.body.excerpt,
      category: req.body.category,
      author: req.body.author,
    };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null || value === '') {
        return res.status(400).json({ success: false, message: `Field "${key}" is required and missing!` });
      }
    }

    if (req.body.status === 'published' && req.currentUser && !hasPermission(req.currentUser, 'posts.publish')) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to publish posts — save as draft or submit for review instead' });
    }

    const postData = {};
    BLOG_POST_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) postData[field] = req.body[field];
    });
    if (req.currentUser) postData.createdBy = req.currentUser._id;

    const baseSlug = toSlug(req.body.slug || req.body.title);
    postData.slug = await uniqueSlug(baseSlug, slugExists());

    const post = await BlogPost.create(postData);
    logActivity({ req, action: 'blog.created', targetType: 'BlogPost', targetId: post._id, targetLabel: post.title, metadata: { status: post.status } });
    return res.status(201).json({ success: true, message: 'Blog post created successfully', data: post });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update an existing blog post
const updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    // A user with only "editOwn" (e.g. the Author role) may edit posts they created; anyone
    // with the broader "edit" permission can touch any post. req.currentUser is only present
    // once requirePermission has run — unset for legacy tokens, which fall back to full access.
    if (req.currentUser && !hasPermission(req.currentUser, 'posts.edit')) {
      const isOwner = post.createdBy && String(post.createdBy) === String(req.currentUser._id);
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'You can only edit posts you created' });
      }
    }
    if (req.body.status === 'published' && post.status !== 'published' && req.currentUser && !hasPermission(req.currentUser, 'posts.publish')) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to publish posts' });
    }

    const previousStatus = post.status;

    // Snapshot the pre-change state before applying edits — Revision History always shows
    // "what it looked like right before this save," never the post-save state.
    BlogRevision.create({
      post: post._id,
      snapshot: post.toObject(),
      savedBy: req.currentUser?._id || req.user?.id || null,
      savedByEmail: req.currentUser?.email || req.user?.email || 'system',
    }).catch((err) => console.error('Failed to save revision:', err.message));

    BLOG_POST_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) post[field] = req.body[field];
    });

    if (req.body.slug) {
      const baseSlug = toSlug(req.body.slug);
      post.slug = await uniqueSlug(baseSlug, slugExists(post._id));
    }

    await post.save();
    logActivity({
      req,
      action: previousStatus !== post.status ? 'blog.status_changed' : 'blog.updated',
      targetType: 'BlogPost',
      targetId: post._id,
      targetLabel: post.title,
      metadata: previousStatus !== post.status ? { from: previousStatus, to: post.status } : {},
    });

    if (previousStatus !== post.status) {
      if (post.status === 'published') {
        notify({ type: 'blog.published', title: 'Blog post published', message: `"${post.title}" is now live.`, link: 'postedBlogPosts' });
      } else if (post.status === 'scheduled') {
        notify({ type: 'blog.scheduled', title: 'Blog post scheduled', message: `"${post.title}" is scheduled for ${new Date(post.publishDate).toLocaleDateString()}.`, link: 'postedBlogPosts' });
      } else if (post.status === 'review') {
        notify({ type: 'review.assigned', title: 'Post submitted for review', message: `"${post.title}" is awaiting review.`, link: 'postedBlogPosts' });
      } else if (previousStatus === 'review' && ['approved', 'needs-revision'].includes(post.status)) {
        notify({ type: 'review.completed', title: 'Review completed', message: `"${post.title}" was marked ${post.status}.`, link: 'postedBlogPosts' });
      }
    }

    const { score } = computeSeoScore(post);
    if (score < 40) {
      notify({ type: 'seo.warning', title: 'Low SEO score', message: `"${post.title}" scored ${score}/100 on SEO.`, link: 'seoManager' });
    }

    const { internal } = scanPostLinks(post);
    if (internal.length > 0) {
      const brokenCount = (
        await Promise.all(internal.map((link) => BlogPost.exists({ slug: link.slug })))
      ).filter((exists) => !exists).length;
      if (brokenCount > 0) {
        notify({ type: 'seo.broken_link', title: 'Broken internal link detected', message: `"${post.title}" links to ${brokenCount} missing page(s).`, link: 'internalLinks' });
      }
    }

    return res.status(200).json({ success: true, message: 'Blog post updated successfully', data: post });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a blog post
const deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    await post.deleteOne();
    logActivity({ req, action: 'blog.deleted', targetType: 'BlogPost', targetId: post._id, targetLabel: post.title });
    return res.status(200).json({ success: true, message: 'Blog post deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get blog posts — search, filter, sort, paginate (query params: page, limit, category,
// tag, author (slugs), q, sort, featured, status)
const getBlogPosts = async (req, res) => {
  try {
    await promoteDueScheduledPosts();

    const { page, limit, skip } = parsePagination(req.query);
    const { category, tag, author, q, sort, featured, pinned, trending } = req.query;

    const filter = {};

    if (ALL_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    } else if (req.query.status !== 'all') {
      filter.status = 'published';
    }

    if (featured === 'true') filter.featured = true;
    if (pinned === 'true') filter.pinned = true;
    if (trending === 'true') filter.trending = true;

    if (req.query.publishedFrom || req.query.publishedTo) {
      filter.publishDate = {};
      if (req.query.publishedFrom) filter.publishDate.$gte = new Date(req.query.publishedFrom);
      if (req.query.publishedTo) filter.publishDate.$lte = new Date(req.query.publishedTo);
    }

    let noResults = false;

    if (category) {
      const categoryDoc = await BlogCategory.findOne({ slug: category }).select('_id');
      if (categoryDoc) filter.category = categoryDoc._id;
      else noResults = true;
    }
    if (tag) {
      const tagDoc = await BlogTag.findOne({ slug: tag }).select('_id');
      if (tagDoc) filter.tags = tagDoc._id;
      else noResults = true;
    }
    if (author) {
      const authorDoc = await BlogAuthor.findOne({ slug: author }).select('_id');
      if (authorDoc) filter.author = authorDoc._id;
      else noResults = true;
    }

    if (q && q.trim()) {
      // Regex OR across post fields + resolved category/tag/author name matches, rather than
      // $text (which MongoDB doesn't reliably support nested inside $or) — see model comment.
      const regex = new RegExp(escapeRegex(q.trim()), 'i');
      const [matchedCategories, matchedTags, matchedAuthors] = await Promise.all([
        BlogCategory.find({ name: regex }).select('_id'),
        BlogTag.find({ name: regex }).select('_id'),
        BlogAuthor.find({ name: regex }).select('_id'),
      ]);
      filter.$or = [
        { title: regex },
        { excerpt: regex },
        { slug: regex },
        { searchText: regex },
        { category: { $in: matchedCategories.map((c) => c._id) } },
        { tags: { $in: matchedTags.map((t) => t._id) } },
        { author: { $in: matchedAuthors.map((a) => a._id) } },
      ];
    }

    if (noResults) {
      return res.status(200).json({ success: true, data: { posts: [], pagination: buildPaginationMeta(page, limit, 0) } });
    }

    const sortSpec = SORTS[sort] || SORTS.newest;

    const [rawPosts, total] = await Promise.all([
      // Fetches content/searchText (needed to compute seoScore below) but strips them back out
      // before responding — list/card views never render the full body, so no reason to ship it.
      BlogPost.find(filter)
        .populate('category', POPULATE_CATEGORY)
        .populate('tags', POPULATE_TAG)
        .populate('author', POPULATE_AUTHOR)
        .sort(sortSpec)
        .skip(skip)
        .limit(limit),
      BlogPost.countDocuments(filter),
    ]);

    const posts = rawPosts.map((post) => {
      const { score } = computeSeoScore(post);
      const obj = post.toObject();
      delete obj.content;
      delete obj.searchText;
      delete obj.faqs;
      return { ...obj, seoScore: score };
    });

    return res.status(200).json({
      success: true,
      data: { posts, pagination: buildPaginationMeta(page, limit, total) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Scores candidate posts by shared category (+2), shared tag count (+1 each), and a light
// popularity nudge — a content-similarity proxy. True "user behaviour" based recommendations
// would need session/analytics infrastructure this app doesn't have; flagged as out of scope.
const getRelatedPosts = async (post, limit = 4) => {
  const manualIds = (post.relatedPostIds || []).map(String);
  const manualPosts = manualIds.length
    ? await BlogPost.find({ _id: { $in: manualIds }, status: 'published' })
        .populate('category', POPULATE_CATEGORY)
        .populate('tags', POPULATE_TAG)
        .populate('author', POPULATE_AUTHOR)
    : [];

  const remaining = limit - manualPosts.length;
  if (remaining <= 0) return manualPosts.slice(0, limit);

  const postTagIds = (post.tags || []).map((t) => t._id || t);
  const excludeIds = [post._id, ...manualIds];

  const candidates = await BlogPost.find({
    _id: { $nin: excludeIds },
    status: 'published',
    $or: [{ category: post.category?._id || post.category }, { tags: { $in: postTagIds } }],
  })
    .populate('category', POPULATE_CATEGORY)
    .populate('tags', POPULATE_TAG)
    .populate('author', POPULATE_AUTHOR)
    .limit(30);

  const postCategoryId = String(post.category?._id || post.category);
  const postTagIdSet = new Set(postTagIds.map(String));

  const scored = candidates.map((candidate) => {
    const sameCategory = String(candidate.category?._id) === postCategoryId;
    const sharedTags = (candidate.tags || []).filter((t) => postTagIdSet.has(String(t._id))).length;
    const popularityScore = Math.log10((candidate.views || 0) + 1) * 0.1;
    return { candidate, score: (sameCategory ? 2 : 0) + sharedTags + popularityScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return [...manualPosts, ...scored.slice(0, remaining).map((s) => s.candidate)];
};

// @desc Get a single published blog post by slug, with related posts + prev/next navigation
const getBlogPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    await BlogPost.updateOne(
      { slug, status: 'scheduled', publishDate: { $lte: new Date() } },
      { $set: { status: 'published' } }
    );
    const post = await BlogPost.findOne({ slug })
      .populate('category', POPULATE_CATEGORY)
      .populate('tags', POPULATE_TAG)
      .populate('author', POPULATE_AUTHOR);

    if (!post || (post.status !== 'published' && req.query.preview !== 'true')) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    const [relatedPosts, prevPost, nextPost] = await Promise.all([
      getRelatedPosts(post),
      BlogPost.findOne({ status: 'published', publishDate: { $lt: post.publishDate } })
        .sort({ publishDate: -1 })
        .select('title slug featuredImage featuredImageAlt'),
      BlogPost.findOne({ status: 'published', publishDate: { $gt: post.publishDate } })
        .sort({ publishDate: 1 })
        .select('title slug featuredImage featuredImageAlt'),
    ]);

    return res.status(200).json({ success: true, data: { post, relatedPosts, prevPost, nextPost } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Increment a post's view count (fire-and-forget from the client on article mount)
const incrementBlogPostViews = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await BlogPost.findOneAndUpdate({ slug }, { $inc: { views: 1 } }, { new: true }).select('views');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    return res.status(200).json({ success: true, data: { views: post.views } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Increment a post's like count
const likeBlogPost = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await BlogPost.findOneAndUpdate({ slug }, { $inc: { likes: 1 } }, { new: true }).select('likes');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    return res.status(200).json({ success: true, data: { likes: post.likes } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Upload a blog featured/banner image to Cloudinary and return its URL
const uploadBlogImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    recordMediaUpload({ file: req.file, folder: 'blog-posts', uploadedBy: req.currentUser?._id });
    return res.status(201).json({ success: true, data: { url: req.file.path } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const BULK_ACTIONS = ['publish', 'archive', 'draft', 'delete'];
const BULK_ACTION_STATUS = { publish: 'published', archive: 'archived', draft: 'draft' };

// @desc Apply one action (publish/archive/draft/delete) to many posts at once
const bulkAction = async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
    }
    if (!BULK_ACTIONS.includes(action)) {
      return res.status(400).json({ success: false, message: `action must be one of: ${BULK_ACTIONS.join(', ')}` });
    }
    if (action === 'publish' && req.currentUser && !hasPermission(req.currentUser, 'posts.publish')) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to publish posts' });
    }
    if (action === 'delete' && req.currentUser && !hasPermission(req.currentUser, 'posts.delete')) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to delete posts' });
    }

    if (action === 'delete') {
      const result = await BlogPost.deleteMany({ _id: { $in: ids } });
      logActivity({ req, action: 'blog.bulk_deleted', metadata: { count: result.deletedCount, ids } });
      return res.status(200).json({ success: true, message: `Deleted ${result.deletedCount} post(s)`, data: { count: result.deletedCount } });
    }

    const result = await BlogPost.updateMany({ _id: { $in: ids } }, { $set: { status: BULK_ACTION_STATUS[action] } });
    logActivity({ req, action: 'blog.bulk_status_changed', metadata: { count: result.modifiedCount, status: BULK_ACTION_STATUS[action], ids } });
    return res.status(200).json({ success: true, message: `Updated ${result.modifiedCount} post(s)`, data: { count: result.modifiedCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Duplicate a post as a new draft — a fresh copy the admin can then edit independently
const duplicatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await BlogPost.findById(id).lean();
    if (!original) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    // eslint-disable-next-line no-unused-vars
    const { _id, slug, createdAt, updatedAt, views, likes, shares, ...rest } = original;
    const baseSlug = toSlug(`${original.title}-copy`);
    const newSlug = await uniqueSlug(baseSlug, slugExists());

    const duplicate = await BlogPost.create({
      ...rest,
      title: `${original.title} (Copy)`,
      slug: newSlug,
      status: 'draft',
      createdBy: req.currentUser?._id || null,
    });

    logActivity({ req, action: 'blog.duplicated', targetType: 'BlogPost', targetId: duplicate._id, targetLabel: duplicate.title, metadata: { fromId: original._id } });
    return res.status(201).json({ success: true, message: 'Post duplicated', data: duplicate });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Export all posts as CSV (admin's own field set, not the public content shape)
const exportPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find()
      .populate('category', 'name')
      .populate('author', 'name')
      .select('title slug status excerpt category author views readingTime publishDate')
      .lean();

    const rows = posts.map((p) => ({
      title: p.title,
      slug: p.slug,
      status: p.status,
      excerpt: p.excerpt,
      category: p.category?.name || '',
      author: p.author?.name || '',
      views: p.views,
      readingTime: p.readingTime,
      publishDate: p.publishDate,
    }));

    const parser = new CsvParser({ fields: ['title', 'slug', 'status', 'excerpt', 'category', 'author', 'views', 'readingTime', 'publishDate'] });
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment(`blog-posts-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const parseCsvLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else current += char;
  }
  fields.push(current.trim());
  return fields;
};

const resolveOrCreateByName = async (Model, name) => {
  const trimmed = name.trim();
  let doc = await Model.findOne({ name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (!doc) {
    const baseSlug = toSlug(trimmed);
    const slug = await uniqueSlug(baseSlug, async (s) => Model.exists({ slug: s }));
    doc = await Model.create({ name: trimmed, slug });
  }
  return doc;
};

// @desc Bulk-import posts from an uploaded CSV (columns: title, excerpt, category, author,
// tags (semicolon-separated), status). Category/author/tags are resolved by name, creating
// them if they don't already exist — same behavior as the admin form's "+ New" quick-add.
const importPosts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A CSV file is required' });
    }
    const lines = req.file.buffer.toString('utf-8').trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV file has no data rows' });
    }
    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idx = (name) => header.indexOf(name);
    if (idx('title') === -1 || idx('excerpt') === -1 || idx('category') === -1 || idx('author') === -1) {
      return res.status(400).json({ success: false, message: 'CSV must have title, excerpt, category, and author columns' });
    }

    let created = 0;
    const errors = [];
    for (const line of lines.slice(1)) {
      const fields = parseCsvLine(line);
      const title = fields[idx('title')];
      const excerpt = fields[idx('excerpt')];
      const categoryName = fields[idx('category')];
      const authorName = fields[idx('author')];
      if (!title || !excerpt || !categoryName || !authorName) {
        errors.push(`Skipped a row missing required fields`);
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        const [category, author] = await Promise.all([
          resolveOrCreateByName(BlogCategory, categoryName),
          resolveOrCreateByName(BlogAuthor, authorName),
        ]);

        let tagIds = [];
        if (idx('tags') !== -1 && fields[idx('tags')]) {
          const tagNames = fields[idx('tags')].split(';').map((t) => t.trim()).filter(Boolean);
          // eslint-disable-next-line no-await-in-loop
          const tags = await Promise.all(tagNames.map((name) => resolveOrCreateByName(BlogTag, name)));
          tagIds = tags.map((t) => t._id);
        }

        const status = idx('status') !== -1 && ALL_STATUSES.includes(fields[idx('status')]) ? fields[idx('status')] : 'draft';
        const baseSlug = toSlug(title);
        // eslint-disable-next-line no-await-in-loop
        const slug = await uniqueSlug(baseSlug, slugExists());

        // eslint-disable-next-line no-await-in-loop
        await BlogPost.create({
          title, excerpt, category: category._id, author: author._id, tags: tagIds, status, slug,
          createdBy: req.currentUser?._id || null,
        });
        created += 1;
      } catch (rowError) {
        errors.push(`"${title}": ${rowError.message}`);
      }
    }

    logActivity({ req, action: 'blog.bulk_imported', metadata: { created, errorCount: errors.length } });
    return res.status(200).json({ success: true, message: `Imported ${created} post(s)${errors.length ? `, ${errors.length} skipped` : ''}`, data: { created, errors: errors.slice(0, 10) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};
