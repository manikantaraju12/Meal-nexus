const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['donor', 'volunteer', 'ngo', 'admin'],
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  organization: {
    name: String,
    type: { type: String }, // restaurant, event, ngo, etc.
    registrationNumber: String,
    fssaiNumber: String // for food donors
  },
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    documents: [String] // URLs to uploaded documents
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  preferredFoodTypes: [{
    type: String,
    enum: ['veg', 'non-veg', 'mixed']
  }],
  maxCapacity: {
    type: Number,
    default: 10
  },
  stats: {
    totalDonations: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    peopleHelped: { type: Number, default: 0 },
    mealsServed: { type: Number, default: 0 },
    activeTasks: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0.8 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
