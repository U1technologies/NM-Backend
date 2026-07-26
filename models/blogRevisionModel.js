const mongoose = require('mongoose');

// A snapshot of a post's editable fields taken right before each update — lets the admin
// compare versions and roll back. `snapshot` is intentionally Mixed rather than a strict
// sub-schema so it stays in lockstep with whatever fields BlogPost has at snapshot time.
const blogRevisionSchema = mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true, index: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    savedByEmail: { type: String, default: 'system' },
  },
  { timestamps: true }
);

blogRevisionSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model('BlogRevision', blogRevisionSchema);
