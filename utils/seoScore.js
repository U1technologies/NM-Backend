// utils/seoScore.js
// A real, computable on-page SEO heuristic (0-100) — not a fabricated number. Each check is a
// concrete, verifiable fact about the post. Shared by the Posted Blogs table (per-post score)
// and the SEO Manager's "low score articles" report.
const POINTS = {
  titleLength: 15,
  metaDescription: 15,
  focusKeywordPresent: 10,
  focusKeywordInTitle: 10,
  focusKeywordInMeta: 10,
  focusKeywordInContent: 10,
  imageAlt: 10,
  excerpt: 10,
  internalLink: 10,
};

const TOTAL_POSSIBLE = Object.values(POINTS).reduce((a, b) => a + b, 0);

const computeSeoScore = (post) => {
  const checks = {};
  const title = post.title || '';
  const meta = post.metaDescription || '';
  const keyword = (post.focusKeyword || '').trim().toLowerCase();
  const contentText = (post.searchText || '') + ' ' + (post.excerpt || '');

  checks.titleLength = title.length >= 30 && title.length <= 60;
  checks.metaDescription = meta.length >= 120 && meta.length <= 160;
  checks.focusKeywordPresent = keyword.length > 0;
  checks.focusKeywordInTitle = keyword.length > 0 && title.toLowerCase().includes(keyword);
  checks.focusKeywordInMeta = keyword.length > 0 && meta.toLowerCase().includes(keyword);
  checks.focusKeywordInContent = keyword.length > 0 && contentText.toLowerCase().includes(keyword);
  checks.imageAlt = !post.featuredImage || !!post.featuredImageAlt?.trim();
  checks.excerpt = (post.excerpt || '').length >= 50;
  checks.internalLink = /href=["']\/blogs\//.test(post.content?.map((b) => b.html || '').join(' ') || '');

  const earned = Object.entries(checks).reduce((sum, [key, passed]) => sum + (passed ? POINTS[key] : 0), 0);
  const score = Math.round((earned / TOTAL_POSSIBLE) * 100);

  return { score, checks };
};

module.exports = { computeSeoScore, POINTS };
