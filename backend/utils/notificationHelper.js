const Notification = require('../models/Notification');

/**
 * Create a notification for a user
 */
async function createNotification({ recipient, type, title, message, data = {} }) {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      data
    });
    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

module.exports = { createNotification };
