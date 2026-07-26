const mongoose = require('mongoose');

const activityLogSchema = mongoose.Schema(
  {
    // Null user + userEmail 'system' represents a system-generated event (e.g. a scheduled
    // post auto-publishing) rather than a human action — the same collection covers both
    // "Activity Logs" (who did what) and "System Logs" (what the app did on its own).
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userEmail: { type: String, default: 'system' },
    action: { type: String, required: true }, // e.g. 'blog.created', 'user.login'
    targetType: { type: String, default: '' }, // e.g. 'BlogPost'
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Denormalized so the log entry still reads sensibly after the target itself is deleted.
    targetLabel: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
