const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const { auth, authorize } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationHelper');

// @route   GET /api/campaigns
// @desc    Get all campaigns (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, type, city } = req.query;
    let query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (city) query['location.city'] = new RegExp(city, 'i');

    const campaigns = await Campaign.find(query)
      .populate('createdBy', 'name organization')
      .populate('progress.donors', 'name')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/campaigns/:id
// @desc    Get single campaign
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'name organization email phone')
      .populate('progress.donors', 'name');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/campaigns
// @desc    Create a new campaign
// @access  Private (NGO, Admin)
router.post('/', auth, authorize('ngo', 'admin'), async (req, res) => {
  try {
    const campaignData = {
      ...req.body,
      createdBy: req.user._id
    };

    const campaign = await Campaign.create(campaignData);
    const populated = await Campaign.findById(campaign._id)
      .populate('createdBy', 'name organization');

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/campaigns/:id
// @desc    Update campaign
// @access  Private (Creator or Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Only creator or admin can update
    if (campaign.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updated = await Campaign.findByIdAndUpdate(
      req.params.id,
      { ...req.body, 'progress.lastUpdated': new Date() },
      { new: true }
    ).populate('createdBy', 'name organization');

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/campaigns/:id
// @desc    Delete campaign
// @access  Private (Creator or Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
