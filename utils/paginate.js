// utils/paginate.js
// Shared page/limit parsing + response-shape builder for list endpoints (blog posts,
// category/tag/author post listings). Keeps pagination math in one place.
const DEFAULT_LIMIT = 12;
// Raised from 50 — the admin Posted Blogs table requests a high limit to show the full
// catalog in one page, and 50 was silently truncating it once seed data passed that count.
const MAX_LIMIT = 200;

const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { parsePagination, buildPaginationMeta };
