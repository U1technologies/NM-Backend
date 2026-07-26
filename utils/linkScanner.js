// utils/linkScanner.js
// Extracts every link found in a post's content blocks — shared by the SEO Manager (broken
// link detection) and the Internal Link Manager (orphan pages, link suggestions).
const HREF_REGEX = /href=["']([^"']+)["']/g;

const extractHrefsFromBlock = (block) => {
  const hrefs = [];
  if (block.href) hrefs.push(block.href);
  if (block.buttonHref) hrefs.push(block.buttonHref);
  if (block.html) {
    let match;
    while ((match = HREF_REGEX.exec(block.html)) !== null) hrefs.push(match[1]);
  }
  return hrefs;
};

// A post-detail link looks like /blogs/<slug> — explicitly excludes the /blogs/category|tag|author
// index routes, which aren't post links.
const POST_LINK_REGEX = /\/blogs\/(?!category\/|tag\/|author\/|search)([a-z0-9-]+)\/?$/i;

const scanPostLinks = (post) => {
  const hrefs = (post.content || []).flatMap(extractHrefsFromBlock);
  const internal = [];
  const external = [];

  hrefs.forEach((href) => {
    const match = href.match(POST_LINK_REGEX);
    if (match) {
      internal.push({ href, slug: match[1] });
    } else if (/^https?:\/\//i.test(href)) {
      external.push(href);
    }
  });

  return { internal, external };
};

// Builds a simple directed link graph across a post catalog: who links to whom, who's broken,
// and (by elimination) who has zero inbound links from any other post — an "orphan" page.
const buildLinkGraph = (posts) => {
  const slugSet = new Set(posts.map((p) => p.slug));
  const inboundCount = new Map(posts.map((p) => [p.slug, 0]));
  const broken = [];
  const outboundBySlug = new Map();

  posts.forEach((post) => {
    const { internal } = scanPostLinks(post);
    const resolvedTargets = [];
    internal.forEach((link) => {
      if (slugSet.has(link.slug)) {
        if (link.slug !== post.slug) {
          inboundCount.set(link.slug, (inboundCount.get(link.slug) || 0) + 1);
          resolvedTargets.push(link.slug);
        }
      } else {
        broken.push({ fromTitle: post.title, fromSlug: post.slug, href: link.href });
      }
    });
    outboundBySlug.set(post.slug, resolvedTargets);
  });

  const orphans = posts.filter((p) => (inboundCount.get(p.slug) || 0) === 0);

  return { inboundCount, broken, outboundBySlug, orphans };
};

module.exports = { scanPostLinks, buildLinkGraph };
