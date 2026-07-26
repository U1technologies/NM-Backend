const BlogPost = require('../models/blogPostModel');
const { buildLinkGraph } = require('../utils/linkScanner');

const POST_FIELDS = 'title slug category tags content focusKeyword publishDate status';

// @desc Internal linking health: orphan pages, broken internal links, and anchor-text
// suggestions (posts sharing a category/tag that aren't yet linked to each other).
const getInternalLinkOverview = async (req, res) => {
  try {
    const posts = await BlogPost.find({ status: { $nin: ['archived', 'rejected'] } }).select(POST_FIELDS).lean();
    const { broken, orphans, outboundBySlug } = buildLinkGraph(posts);

    const suggestions = [];

    posts.forEach((post) => {
      const alreadyLinked = new Set(outboundBySlug.get(post.slug) || []);
      const candidates = posts.filter((other) => {
        if (other.slug === post.slug || alreadyLinked.has(other.slug)) return false;
        const sameCategory = String(other.category) === String(post.category);
        const sharedTags = (other.tags || []).some((t) => (post.tags || []).some((pt) => String(pt) === String(t)));
        return sameCategory || sharedTags;
      });

      candidates.slice(0, 3).forEach((candidate) => {
        suggestions.push({
          fromTitle: post.title,
          fromSlug: post.slug,
          toTitle: candidate.title,
          toSlug: candidate.slug,
          suggestedAnchor: candidate.focusKeyword || candidate.title,
        });
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        totalPosts: posts.length,
        orphanPages: orphans.map((p) => ({ _id: p._id, title: p.title, slug: p.slug })),
        brokenInternalLinks: broken,
        suggestions: suggestions.slice(0, 50),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getInternalLinkOverview };
