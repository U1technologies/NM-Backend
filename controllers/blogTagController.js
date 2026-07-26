const BlogTag = require('../models/blogTagModel');
const BlogPost = require('../models/blogPostModel');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const { toSlug, uniqueSlug } = require('../utils/slugify');
const logActivity = require('../utils/activityLogger');

const slugExists = (excludeId) => async (slug) => {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return BlogTag.exists(query);
};

// @desc Get all blog tags, each with its published post count
const getBlogTags = async (req, res) => {
  try {
    const tags = await BlogTag.find().sort({ name: 1 }).lean();
    const counts = await BlogPost.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
    ]);
    const countByTagId = new Map(counts.map((c) => [String(c._id), c.count]));

    const data = tags.map((tag) => ({
      ...tag,
      postCount: countByTagId.get(String(tag._id)) || 0,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get a single tag by slug, with its published posts (paginated)
const getBlogTagBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const tag = await BlogTag.findOne({ slug });
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = { tags: tag._id, status: 'published' };

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
      data: { tag, posts, pagination: buildPaginationMeta(page, limit, total) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create a new blog tag
const createBlogTag = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ success: false, message: 'Field "name" is required and missing!' });
    }

    const baseSlug = toSlug(req.body.slug || req.body.name);
    const slug = await uniqueSlug(baseSlug, slugExists());

    const tag = await BlogTag.create({ name: req.body.name, slug });
    logActivity({ req, action: 'tag.created', targetType: 'BlogTag', targetId: tag._id, targetLabel: tag.name });
    return res.status(201).json({ success: true, message: 'Tag created successfully', data: tag });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update an existing blog tag
const updateBlogTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await BlogTag.findById(id);
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    if (req.body.name !== undefined) tag.name = req.body.name;

    if (req.body.slug || req.body.name) {
      const baseSlug = toSlug(req.body.slug || req.body.name);
      tag.slug = await uniqueSlug(baseSlug, slugExists(tag._id));
    }

    await tag.save();
    logActivity({ req, action: 'tag.updated', targetType: 'BlogTag', targetId: tag._id, targetLabel: tag.name });
    return res.status(200).json({ success: true, message: 'Tag updated successfully', data: tag });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a blog tag — tags are a non-required many-to-many field on BlogPost, so instead
// of blocking the delete we just pull this tag out of every post that references it.
const deleteBlogTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await BlogTag.findById(id);
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    await BlogPost.updateMany({ tags: id }, { $pull: { tags: id } });
    await tag.deleteOne();
    logActivity({ req, action: 'tag.deleted', targetType: 'BlogTag', targetId: tag._id, targetLabel: tag.name });
    return res.status(200).json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Merge one tag into another — every post tagged with the source tag gets the target
// tag added (deduplicated by Mongo's $addToSet), the source tag reference is removed, and the
// now-unused source tag is deleted.
const mergeTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { intoTagId } = req.body;
    if (!intoTagId) {
      return res.status(400).json({ success: false, message: 'intoTagId is required' });
    }
    if (intoTagId === id) {
      return res.status(400).json({ success: false, message: 'Cannot merge a tag into itself' });
    }

    const [source, target] = await Promise.all([BlogTag.findById(id), BlogTag.findById(intoTagId)]);
    if (!source || !target) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    await BlogPost.updateMany({ tags: source._id }, { $addToSet: { tags: target._id } });
    await BlogPost.updateMany({ tags: source._id }, { $pull: { tags: source._id } });
    await source.deleteOne();

    logActivity({ req, action: 'tag.merged', targetType: 'BlogTag', targetId: target._id, targetLabel: `${source.name} -> ${target.name}` });
    return res.status(200).json({ success: true, message: `Merged "${source.name}" into "${target.name}"` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBlogTags, getBlogTagBySlug, createBlogTag, updateBlogTag, deleteBlogTag, mergeTag };
