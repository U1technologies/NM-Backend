const ActivityLog = require('../models/activityLogModel');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');

// @desc List activity/system logs (query params: page, limit, action, userEmail, targetType, scope)
const getActivityLogs = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.action?.trim()) filter.action = new RegExp(req.query.action.trim(), 'i');
    if (req.query.userEmail?.trim()) filter.userEmail = new RegExp(req.query.userEmail.trim(), 'i');
    if (req.query.targetType?.trim()) filter.targetType = req.query.targetType.trim();
    // scope=system → only app-generated events (no human actor); scope=user → only human actions
    if (req.query.scope === 'system') filter.user = null;
    else if (req.query.scope === 'user') filter.user = { $ne: null };

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ActivityLog.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data: { logs, pagination: buildPaginationMeta(page, limit, total) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getActivityLogs };
