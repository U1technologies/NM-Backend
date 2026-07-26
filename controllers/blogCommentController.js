const BlogComment = require('../models/blogCommentModel');
const BlogPost = require('../models/blogPostModel');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');
const notify = require('../utils/notifier');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POPULATE_POST = 'title slug';

// @desc Submit a new comment (or reply) on a published post — public, no auth. Boundary
// validation lives here since this is the one write endpoint reachable by anonymous visitors.
const createComment = async (req, res) => {
  try {
    const { postSlug, name, email, content, parentId } = req.body;

    if (!postSlug || !name?.trim() || !email?.trim() || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'postSlug, name, email, and content are all required' });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }
    if (content.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Comment is too long (2000 character limit)' });
    }

    const post = await BlogPost.findOne({ slug: postSlug, status: 'published' }).select('_id');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isBlocked = await BlogComment.exists({ email: normalizedEmail, blocked: true });
    if (isBlocked) {
      return res.status(403).json({ success: false, message: 'This email address is no longer able to comment' });
    }

    if (parentId) {
      const parent = await BlogComment.findOne({ _id: parentId, post: post._id });
      if (!parent) {
        return res.status(404).json({ success: false, message: 'The comment you are replying to was not found' });
      }
    }

    const comment = await BlogComment.create({
      post: post._id,
      parentComment: parentId || null,
      name: name.trim(),
      email: normalizedEmail,
      content: content.trim(),
      status: 'pending',
    });

    notify({ type: 'comment.pending', title: 'New comment awaiting moderation', message: `${name.trim()} commented — pending review.`, link: 'comments' });

    return res.status(201).json({ success: true, message: 'Comment submitted for review', data: comment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Public: approved comments for a post, threaded under their parent — no auth, and
// deliberately excludes `email` (PII that has no reason to be publicly visible).
const getPublicCommentsForPost = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await BlogPost.findOne({ slug }).select('_id');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comments = await BlogComment.find({ post: post._id, status: 'approved' })
      .select('name content parentComment isAdminReply likes dislikes createdAt')
      .sort({ createdAt: 1 });

    const byId = new Map(comments.map((c) => [String(c._id), { ...c.toObject(), replies: [] }]));
    const roots = [];
    byId.forEach((comment) => {
      if (comment.parentComment && byId.has(String(comment.parentComment))) {
        byId.get(String(comment.parentComment)).replies.push(comment);
      } else {
        roots.push(comment);
      }
    });

    return res.status(200).json({ success: true, data: { comments: roots, total: comments.length } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc List comments for moderation (query params: page, limit, status, postId, q)
const getComments = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, postId, q } = req.query;

    const filter = {};
    if (['pending', 'approved', 'spam', 'trash'].includes(status)) filter.status = status;
    if (postId) filter.post = postId;
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { content: regex }];
    }

    const [comments, total, counts] = await Promise.all([
      BlogComment.find(filter).populate('post', POPULATE_POST).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BlogComment.countDocuments(filter),
      BlogComment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const countByStatus = { pending: 0, approved: 0, spam: 0, trash: 0 };
    counts.forEach((c) => { countByStatus[c._id] = c.count; });

    return res.status(200).json({
      success: true,
      data: { comments, pagination: buildPaginationMeta(page, limit, total), countByStatus },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Moderate a comment's status (approve / spam / trash / back to pending)
const moderateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'approved', 'spam', 'trash'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const comment = await BlogComment.findByIdAndUpdate(id, { status }, { new: true });
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    logActivity({
      req,
      action: 'comment.moderated',
      targetType: 'BlogComment',
      targetId: comment._id,
      targetLabel: comment.content.slice(0, 60),
      metadata: { status },
    });
    return res.status(200).json({ success: true, message: 'Comment updated', data: comment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Post an admin reply to a comment — auto-approved since it's staff-authored
const replyToComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    const parent = await BlogComment.findById(id);
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const reply = await BlogComment.create({
      post: parent.post,
      parentComment: parent._id,
      name: 'NextagMedia Team',
      email: 'noreply@nextagmedia.com',
      content: content.trim(),
      status: 'approved',
      isAdminReply: true,
    });

    logActivity({
      req,
      action: 'comment.replied',
      targetType: 'BlogComment',
      targetId: reply._id,
      targetLabel: reply.content.slice(0, 60),
    });
    return res.status(201).json({ success: true, message: 'Reply posted', data: reply });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Block a commenter — marks every existing comment from that email as blocked and
// rejects any future submissions from the same address (see createComment).
const blockCommenter = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await BlogComment.findById(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    await BlogComment.updateMany({ email: comment.email }, { blocked: true, status: 'spam' });
    logActivity({
      req,
      action: 'comment.commenter_blocked',
      targetType: 'BlogComment',
      targetId: comment._id,
      targetLabel: comment.email,
    });
    return res.status(200).json({ success: true, message: `Blocked ${comment.email}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a comment permanently
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await BlogComment.findById(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    await comment.deleteOne();
    logActivity({
      req,
      action: 'comment.deleted',
      targetType: 'BlogComment',
      targetId: comment._id,
      targetLabel: comment.content.slice(0, 60),
    });
    return res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Like / dislike a comment — public, no auth (a reader reaction, not a moderation action).
// Returns only the reaction counts, never the full document — this endpoint is reachable by
// anonymous visitors and the full document includes the commenter's email address.
const reactToComment = (field) => async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await BlogComment.findByIdAndUpdate(id, { $inc: { [field]: 1 } }, { new: true }).select('likes dislikes');
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    return res.status(200).json({ success: true, data: { _id: comment._id, likes: comment.likes, dislikes: comment.dislikes } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createComment,
  getPublicCommentsForPost,
  getComments,
  moderateComment,
  replyToComment,
  blockCommenter,
  deleteComment,
  likeComment: reactToComment('likes'),
  dislikeComment: reactToComment('dislikes'),
};
