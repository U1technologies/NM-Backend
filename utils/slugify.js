// utils/slugify.js
// Mirrors the frontend's toSlug() in nextage-media/utils/utils.js so slugs generated on
// either side of the stack look identical.
const toSlug = (str) =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// Appends -2, -3, ... until `candidate` doesn't collide with an existing document,
// checked via `exists(slug)` — a caller-supplied async fn (Model.exists({ slug })-style)
// so this helper stays independent of any one Mongoose model.
const uniqueSlug = async (baseSlug, exists, excludeId) => {
  let slug = baseSlug;
  let suffix = 2;
  while (await exists(slug, excludeId)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
};

module.exports = { toSlug, uniqueSlug };
