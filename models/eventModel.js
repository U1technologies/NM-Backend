const mongoose = require('mongoose');

// `content` reuses the exact same typed-block contract as BlogPost.content (see
// blogPostModel.js for the full block type reference) — the admin's event form reuses the
// Blog ContentEditor, and the public event detail page reuses BlogContentRenderer, so the
// shape has to match block-for-block.
const eventSchema = mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    seoTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },

    description: { type: String, required: true },
    content: { type: [mongoose.Schema.Types.Mixed], default: [] },

    location: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Conference', 'Summit', 'Exhibition', 'Awards', 'Meetup', 'Workshop'],
      index: true,
    },
    geoRegion: {
      type: String,
      required: true,
      enum: ['MEA', 'APAC', 'Europe', 'Americas', 'Africa'],
      index: true,
    },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },

    // Official ticket/event-site link — optional, shown as the "Tickets" button when present.
    href: { type: String, default: '' },

    image: { type: String, default: '' },
    imageAlt: { type: String, default: '' },

    // Optional card styling: short hero label on the card image (defaults to geoRegion) and a CSS
    // gradient behind the image. Both fall back to automatic values on the website when blank.
    region: { type: String, default: '', trim: true },
    gradient: { type: String, default: '' },

    // Controls the homepage "Upcoming Events" strip, which only ever shows a handful of events.
    featured: { type: Boolean, default: false, index: true },
    published: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
