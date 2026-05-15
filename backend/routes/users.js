const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't update password here
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/volunteers
// @desc    Get all volunteers (for NGO assignment)
// @access  Private (NGO/Admin)
router.get('/volunteers', auth, authorize('ngo', 'admin'), async (req, res) => {
  try {
    const volunteers = await User.find({ 
      role: 'volunteer',
      isActive: true 
    }).select('-password');
    
    res.json(volunteers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/ngos
// @desc    Get all NGOs
// @access  Public
router.get('/ngos', async (req, res) => {
  try {
    const ngos = await User.find({ 
      role: 'ngo',
      'verification.isVerified': true 
    }).select('-password');
    
    res.json(ngos);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
