const BlogMedia = require('../models/blogMediaModel');
const BlogPost = require('../models/blogPostModel');
const BlogAuthor = require('../models/blogAuthorModel');
const cloudinary = require('../utils/cloudinary');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Media is "in use" if a post's featured/banner image or an author's photo points at it.
// Doesn't scan inside richtext HTML for embedded <img> tags — a reasonable boundary given the
// current admin editor doesn't offer an "insert image into body" tool of its own yet.
const getMediaUsageSet = async () => {
  const [posts, authors] = await Promise.all([
    BlogPost.find({}, 'featuredImage bannerImage').lean(),
    BlogAuthor.find({}, 'photo').lean(),
  ]);
  const used = new Set();
  posts.forEach((p) => {
    if (p.featuredImage) used.add(p.featuredImage);
    if (p.bannerImage) used.add(p.bannerImage);
  });
  authors.forEach((a) => {
    if (a.photo) used.add(a.photo);
  });
  return used;
};

// @desc Record a Cloudinary upload as a BlogMedia entry — called from the existing
// upload-image endpoints (blog posts, authors) right after multer/Cloudinary succeeds.
// Best-effort: a logging failure here must never fail the actual upload response.
const recordMediaUpload = async ({ file, folder, uploadedBy }) => {
  try {
    await BlogMedia.create({
      url: file.path,
      publicId: file.filename,
      folder: folder || 'general',
      originalFilename: file.originalname || '',
      format: file.format || file.path.split('.').pop() || '',
      width: file.width || null,
      height: file.height || null,
      bytes: file.size || file.bytes || 0,
      uploadedBy: uploadedBy || null,
    });
  } catch (error) {
    console.error('Failed to record media upload:', error.message);
  }
};

// @desc List media library items (query params: page, limit, folder, q) with usage + storage stats
const getMediaLibrary = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.folder?.trim() && req.query.folder !== 'all') filter.folder = req.query.folder.trim();
    if (req.query.q?.trim()) filter.originalFilename = new RegExp(escapeRegex(req.query.q.trim()), 'i');

    const [items, total, usedSet, storageAgg, folders] = await Promise.all([
      BlogMedia.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BlogMedia.countDocuments(filter),
      getMediaUsageSet(),
      BlogMedia.aggregate([{ $group: { _id: null, totalBytes: { $sum: '$bytes' }, count: { $sum: 1 } } }]),
      BlogMedia.distinct('folder'),
    ]);

    const data = items.map((item) => ({ ...item.toObject(), inUse: usedSet.has(item.url) }));
    const storage = storageAgg[0] || { totalBytes: 0, count: 0 };

    return res.status(200).json({
      success: true,
      data: { items: data, pagination: buildPaginationMeta(page, limit, total), storage: { totalBytes: storage.totalBytes, count: storage.count }, folders },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a media item — removes it from Cloudinary and from the library record
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await BlogMedia.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    try {
      await cloudinary.uploader.destroy(item.publicId);
    } catch (cloudErr) {
      // Continue even if Cloudinary deletion fails (e.g. already removed there) — an external
      // API hiccup shouldn't block cleaning up our own library record.
      console.error('Cloudinary delete failed:', cloudErr.message);
    }

    await item.deleteOne();
    logActivity({ req, action: 'media.deleted', targetType: 'BlogMedia', targetId: item._id, targetLabel: item.originalFilename || item.publicId });
    return res.status(200).json({ success: true, message: 'Media deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMediaLibrary, deleteMedia, recordMediaUpload };
