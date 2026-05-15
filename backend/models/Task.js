const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  donation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: true
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['pickup', 'delivery'],
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'assigned'
  },
  
  // Location details
  pickupLocation: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  deliveryLocation: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Route optimization
  estimatedDistance: Number, // in km
  estimatedTime: Number, // in minutes
  
  // Timestamps
  assignedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date,
  
  // Proof
  proof: {
    pickupPhoto: String,
    deliveryPhoto: String,
    recipientName: String,
    recipientSignature: String,
    notes: String
  },
  
  // Rating
  rating: {
    score: Number,
    comment: String,
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ratedAt: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
