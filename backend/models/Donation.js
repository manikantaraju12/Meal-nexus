const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['food'],
    required: true
  },

  // For Food Donations
  foodDetails: {
    foodType: {
      type: String,
      enum: ['veg', 'non-veg', 'mixed']
    },
    category: {
      type: String,
      enum: ['cooked', 'packaged', 'raw']
    },
    description: String,
    quantity: {
      value: Number,
      unit: {
        type: String,
        enum: ['meals', 'kg', 'items']
      }
    },
    preparationTime: Date,
    expiryTime: Date,
    images: [String]
  },
  
  // Location
  pickupLocation: {
    address: String,
    city: String,
    state: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  preferredPickupTime: Date,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked', 'delivered', 'cancelled', 'expired'],
    default: 'pending'
  },
  
  // Assignment
  assignedNGO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Priority (for food expiry)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Delivery tracking
  tracking: {
    acceptedAt: Date,
    pickedAt: Date,
    deliveredAt: Date,
    pickupPhoto: String,
    deliveryPhoto: String,
    notes: String
  },
  
  // Impact
  impact: {
    peopleFed: Number,
    mealsServed: Number,
    beneficiaryDetails: String
  }
}, {
  timestamps: true
});

// Index for expiry-based priority
donationSchema.index({ 'foodDetails.expiryTime': 1 });
donationSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model('Donation', donationSchema);
