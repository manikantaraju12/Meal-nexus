const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['food', 'emergency'],
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Target
  target: {
    amount: Number, // for money campaigns
    quantity: Number, // for food/clothes
    unit: String,
    deadline: Date
  },
  
  // Current progress
  progress: {
    current: { type: Number, default: 0 },
    donors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Location (for local campaigns)
  location: {
    city: String,
    state: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Media
  images: [String],
  coverImage: String,
  
  // Impact story
  impact: {
    story: String,
    beneficiaryCount: Number,
    photos: [String],
    videoUrl: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campaign', campaignSchema);
