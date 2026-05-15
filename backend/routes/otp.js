const express = require('express');
const router = express.Router();
const { createAndSendOtp, verifyOtp } = require('../utils/otpService');

// @route   POST /api/otp/send
// @desc    Send OTP to user's phone
// @access  Public
router.post('/send', async (req, res) => {
  try {
    const { phone, purpose } = req.body;

    if (!phone || !purpose) {
      return res.status(400).json({ message: 'Phone and purpose are required' });
    }

    const result = await createAndSendOtp(phone, purpose);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Error sending OTP' });
  }
});

// @route   POST /api/otp/verify
// @desc    Verify OTP code
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { phone, purpose, code } = req.body;

    if (!phone || !purpose || !code) {
      return res.status(400).json({ message: 'Phone, purpose, and code are required' });
    }

    const result = await verifyOtp(phone, purpose, code);

    if (result.valid) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

module.exports = router;
