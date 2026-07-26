const BlogPost = require('../models/blogPostModel');
const { computeSeoScore } = require('../utils/seoScore');
const { buildLinkGraph } = require('../utils/linkScanner');

const POST_FIELDS = 'title slug metaDescription canonicalUrl robotsDirective focusKeyword featuredImage featuredImageAlt excerpt content searchText publishDate status';

// @desc Site-wide SEO health report — real, computed findings (no fabricated scores).
const getSeoOverview = async (req, res) => {
  try {
    // Excludes archived/rejected posts — dead content isn't worth flagging for SEO fixes.
    const posts = await BlogPost.find({ status: { $nin: ['archived', 'rejected'] } }).select(POST_FIELDS).lean();
    const { broken: brokenInternalLinks } = buildLinkGraph(posts);

    const missingMeta = [];
    const missingAlt = [];
    const missingCanonical = [];
    const noindexPages = [];
    const lowScoreArticles = [];
    const titleMap = new Map();
    const metaMap = new Map();

    const toRef = (post) => ({ _id: post._id, title: post.title, slug: post.slug, status: post.status });

    posts.forEach((post) => {
      if (!post.metaDescription?.trim()) missingMeta.push(toRef(post));
      if (post.featuredImage && !post.featuredImageAlt?.trim()) missingAlt.push(toRef(post));
      if (!post.canonicalUrl?.trim()) missingCanonical.push(toRef(post));
      if (post.robotsDirective?.includes('noindex')) noindexPages.push(toRef(post));

      const { score } = computeSeoScore(post);
      if (score < 60) lowScoreArticles.push({ ...toRef(post), score });

      const normalizedTitle = post.title.trim().toLowerCase();
      if (!titleMap.has(normalizedTitle)) titleMap.set(normalizedTitle, []);
      titleMap.get(normalizedTitle).push(toRef(post));

      if (post.metaDescription?.trim()) {
        const normalizedMeta = post.metaDescription.trim().toLowerCase();
        if (!metaMap.has(normalizedMeta)) metaMap.set(normalizedMeta, []);
        metaMap.get(normalizedMeta).push(toRef(post));
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalPosts: posts.length,
        missingMeta,
        missingAlt,
        missingCanonical,
        noindexPages,
        lowScoreArticles: lowScoreArticles.sort((a, b) => a.score - b.score),
        duplicateTitles: [...titleMap.values()].filter((group) => group.length > 1),
        duplicateMetaDescriptions: [...metaMap.values()].filter((group) => group.length > 1),
        brokenInternalLinks,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSeoOverview };
