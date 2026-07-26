const Notification = require('../models/notificationModel');

// @desc List notifications visible to the current user (their own + broadcast ones)
const getNotifications = async (req, res) => {
  try {
    const filter = { $or: [{ recipient: req.user.id }, { recipient: null }] };
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ ...filter, read: false }),
    ]);
    return res.status(200).json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Mark one notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Mark every notification visible to the current user as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ $or: [{ recipient: req.user.id }, { recipient: null }], read: false }, { read: true });
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
