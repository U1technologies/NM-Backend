const mongoose = require('mongoose');

// A null recipient means "broadcast" — shown to every logged-in admin user rather than one
// specific person, since most of these events (a comment awaiting moderation, a newsletter
// milestone) aren't naturally owned by a single account.
const notificationSchema = mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    link: { type: String, default: '' }, // an admin nav section key the UI can jump to on click
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
