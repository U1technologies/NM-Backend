const mongoose = require('mongoose');
const { estimateReadingTime } = require('../utils/readingTime');
const { flattenContentToText } = require('../utils/flattenContent');

/**
 * `content` is an ordered array of typed blocks — this is the single contract shared by the
 * seed data, the admin form, and the frontend's BlogContentRenderer. Every block has a `type`
 * plus type-specific fields:
 *
 *   { type: 'richtext', html }                                   — sanitized Quill HTML output (admin authoring)
 *   { type: 'paragraph', text }
 *   { type: 'heading', level (2-4), text, id }                   — id powers the table of contents anchor
 *   { type: 'list', ordered, items: [string] }
 *   { type: 'checklist', items: [{ text, checked }] }
 *   { type: 'table', headers: [string], rows: [[string]] }
 *   { type: 'comparisonTable', headers: [string], rows: [[string]] }
 *   { type: 'quote', text, author }
 *   { type: 'codeBlock', language, code, caption }
 *   { type: 'image', src, alt, caption }
 *   { type: 'gallery', images: [{ src, alt, caption }] }
 *   { type: 'video', provider ('youtube'|'vimeo'), videoId, caption }
 *   { type: 'callout', variant ('info'|'warning'|'success'), title, text }
 *   { type: 'statsCard', title, items: [{ label, value }] }
 *   { type: 'prosCons', pros: [string], cons: [string] }
 *   { type: 'buttonBlock', label, href, style ('primary'|'outline') }
 *   { type: 'downloadButton', label, href }
 *   { type: 'faq', items: [{ question, answer }] }               — inline FAQ block (separate from post-level `faqs`)
 *   { type: 'cta', variant, title, text, buttonLabel, buttonHref }
 */
const blogPostSchema = mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    seoTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
    robotsDirective: { type: String, default: 'index, follow' },
    focusKeyword: { type: String, default: '' },
    secondaryKeywords: { type: [String], default: [] },

    excerpt: { type: String, required: true },
    featuredImage: { type: String, default: '' },
    featuredImageAlt: { type: String, default: '' },
    bannerImage: { type: String, default: '' },
    bannerImageAlt: { type: String, default: '' },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory', required: true, index: true },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogTag', index: true }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogAuthor', required: true, index: true },

    content: { type: [mongoose.Schema.Types.Mixed], default: [] },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],

    // Editorial workflow — only 'published' (or a due 'scheduled' post, auto-promoted on read;
    // see blogPostController.js) is ever shown on the public site. Every other state is an
    // internal editorial stage.
    status: {
      type: String,
      enum: ['draft', 'in-progress', 'review', 'needs-revision', 'approved', 'scheduled', 'published', 'archived', 'rejected'],
      default: 'published',
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    pinned: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },

    readingTime: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },

    publishDate: { type: Date, default: Date.now, index: true },
    updatedDate: { type: Date, default: Date.now },

    relatedPostIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost' }],

    // The admin/team account that authored this post (distinct from `author`, which is the
    // public-facing byline) — powers the Author role's "editOwn" permission scope.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Denormalized, regenerated on every save — see utils/flattenContent.js. Lets search reach
    // inside table/callout/quote/etc. block content without per-block-type query logic.
    searchText: { type: String, default: '' },
  },
  { timestamps: true }
);

blogPostSchema.pre('save', function (next) {
  if (this.isModified('content') || this.isModified('faqs') || this.isNew) {
    this.readingTime = estimateReadingTime(this.content, this.faqs);
    this.searchText = flattenContentToText(this.content, this.faqs);
  }
  if (this.isModified() && !this.isNew) {
    this.updatedDate = new Date();
  }
  next();
});

module.exports = mongoose.model('BlogPost', blogPostSchema);
