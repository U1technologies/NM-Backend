// utils/activityLogger.js
// Best-effort audit trail write — never throws, so a logging hiccup can never break the
// actual mutation it's describing. Call from controllers after a successful write.
const ActivityLog = require('../models/activityLogModel');

// `actorUser`/`actorEmail` let a caller identify the actor explicitly — needed for events like
// login, where req.currentUser/req.user aren't populated yet (there's no token to decode until
// login succeeds), so the normal req-based fallback would misattribute the action to "system".
const logActivity = async ({ req, action, targetType, targetId, targetLabel, metadata, actorUser, actorEmail }) => {
  try {
    await ActivityLog.create({
      user: actorUser || req?.currentUser?._id || req?.user?.id || null,
      userEmail: actorEmail || req?.currentUser?.email || req?.user?.email || 'system',
      action,
      targetType: targetType || '',
      targetId: targetId || null,
      targetLabel: targetLabel || '',
      metadata: metadata || {},
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
    });
  } catch (error) {
    console.error('Failed to write activity log:', error.message);
  }
};

module.exports = logActivity;
