const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['donation_accepted', 'task_assigned', 'pickup_reminder', 'delivery_complete',
           'expiry_warning', 'verification_complete', 'campaign_update'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
