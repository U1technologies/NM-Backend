const mongoose = require('mongoose');

const newsletterSubscriberSchema = mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    source: {
      type: String,
      enum: ['popup', 'inline', 'footer', 'exit-intent', 'sticky'],
      default: 'inline',
    },
    subscribedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
