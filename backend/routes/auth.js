const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Generate temporary token for OTP flow
const generateTempToken = (id) => {
  return jwt.sign({ id, temp: true }, process.env.JWT_SECRET, { expiresIn: '10m' });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, address, organization } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Normalize phone number (strip non-digits for consistent storage)
    const normalizedPhone = phone ? phone.replace(/\D/g, '') : phone;

    // Create user (password hashed automatically by pre-save hook)
    user = await User.create({
      name,
      email,
      password,
      phone: normalizedPhone,
      role,
      address,
      organization
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (Step 1: Verify credentials, return temp token for OTP)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Return temp token for OTP verification
    res.json({
      success: true,
      requiresOtp: true,
      tempToken: generateTempToken(user._id),
      phone: user.phone,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-login-otp
// @desc    Verify OTP and complete login (Step 2)
// @access  Public
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { tempToken, otpCode } = req.body;

    if (!tempToken || !otpCode) {
      return res.status(400).json({ message: 'Temp token and OTP code are required' });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    if (!decoded.temp) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    const { verifyOtp } = require('../utils/otpService');
    const otpResult = await verifyOtp(user.phone, 'login', otpCode);

    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.message });
    }

    // OTP verified - issue full JWT
    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.verification.isVerified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
