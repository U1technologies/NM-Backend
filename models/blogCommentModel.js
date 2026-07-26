const mongoose = require('mongoose');

const blogCommentSchema = mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true, index: true },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogComment', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'approved', 'spam', 'trash'], default: 'pending', index: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    isAdminReply: { type: Boolean, default: false },
    // Set on every comment from an email once that commenter is blocked — checked on new
    // submissions so a blocked commenter can't keep posting under the same address.
    blocked: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlogComment', blogCommentSchema);
