// utils/notifier.js
// Best-effort notification creation — never throws, so a notification hiccup can never break
// the write it's describing. Mirrors the same fire-and-forget shape as utils/activityLogger.js.
const Notification = require('../models/notificationModel');

const notify = async ({ type, title, message, link, recipient }) => {
  try {
    await Notification.create({ type, title, message: message || '', link: link || '', recipient: recipient || null });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

module.exports = notify;
