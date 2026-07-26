const BlogPost = require('../models/blogPostModel');
const BlogRevision = require('../models/blogRevisionModel');
const logActivity = require('../utils/activityLogger');

// Fields a restore is allowed to write back onto the live post — deliberately excludes
// bookkeeping fields (_id, createdAt, views, likes, shares, searchText, createdBy) so restoring
// an old version never resets engagement counters or reassigns authorship.
const RESTORABLE_FIELDS = [
  'title', 'slug', 'seoTitle', 'metaDescription', 'canonicalUrl', 'robotsDirective', 'focusKeyword', 'secondaryKeywords',
  'excerpt', 'featuredImage', 'featuredImageAlt', 'bannerImage', 'bannerImageAlt', 'category', 'tags', 'author',
  'content', 'faqs', 'status', 'featured', 'pinned', 'trending', 'difficulty',
];

// @desc List revisions for a post (lightweight — no full snapshot payload)
const getRevisionsForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const revisions = await BlogRevision.find({ post: postId }).select('savedByEmail createdAt').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: revisions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get a single revision's full snapshot (for viewing/comparing)
const getRevisionById = async (req, res) => {
  try {
    const { id } = req.params;
    const revision = await BlogRevision.findById(id);
    if (!revision) {
      return res.status(404).json({ success: false, message: 'Revision not found' });
    }
    return res.status(200).json({ success: true, data: revision });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Restore a post to a previous revision's snapshot — snapshots the current (pre-restore)
// state as a new revision first, so a restore is itself undoable.
const restoreRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const revision = await BlogRevision.findById(id);
    if (!revision) {
      return res.status(404).json({ success: false, message: 'Revision not found' });
    }

    const post = await BlogPost.findById(revision.post);
    if (!post) {
      return res.status(404).json({ success: false, message: 'The post this revision belongs to no longer exists' });
    }

    await BlogRevision.create({
      post: post._id,
      snapshot: post.toObject(),
      savedBy: req.currentUser?._id || req.user?.id || null,
      savedByEmail: req.currentUser?.email || req.user?.email || 'system',
    });

    RESTORABLE_FIELDS.forEach((field) => {
      if (revision.snapshot[field] !== undefined) post[field] = revision.snapshot[field];
    });
    await post.save();

    logActivity({ req, action: 'blog.revision_restored', targetType: 'BlogPost', targetId: post._id, targetLabel: post.title, metadata: { revisionId: revision._id } });
    return res.status(200).json({ success: true, message: 'Post restored to previous revision', data: post });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getRevisionsForPost, getRevisionById, restoreRevision };
