const express = require('express');
const router = express.Router();
const axios = require('axios');
const Donation = require('../models/Donation');
const Task = require('../models/Task');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const awsMessaging = require('../utils/awsMessaging');
const { createNotification } = require('../utils/notificationHelper');
const { invokeRankingEndpoint } = require('../utils/sagemakerClient');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3000';

// Calculate priority based on expiry time
function calculatePriority(expiryTime) {
  const now = new Date();
  const expiry = new Date(expiryTime);
  const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);

  if (hoursUntilExpiry <= 2) return 'urgent';
  if (hoursUntilExpiry <= 4) return 'high';
  if (hoursUntilExpiry <= 8) return 'medium';
  return 'low';
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(loc1, loc2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLon = toRad(loc2.lng - loc1.lng);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find best volunteer using AI ranking service
 * Falls back to nearest volunteer on failure
 */
async function findBestVolunteerWithAI(donation) {
  try {
    // Fetch all active volunteers
    const volunteers = await User.find({
      role: 'volunteer',
      isActive: true,
      'address.coordinates': { $exists: true }
    });

    if (volunteers.length === 0) return null;

    // Format candidates for AI service
    const candidates = volunteers.map(v => ({
      _id: v._id.toString(),
      name: v.name,
      address: v.address,
      rating: v.rating,
      stats: v.stats,
      preferredFoodTypes: v.preferredFoodTypes || [],
      maxCapacity: v.maxCapacity || 10
    }));

    // Format donation for AI service
    const donationData = {
      pickupLocation: donation.pickupLocation,
      foodDetails: donation.foodDetails
    };

    // --- Try AWS SageMaker first ---
    const smResult = await invokeRankingEndpoint(donationData, candidates, 'volunteer', 3);
    if (smResult && smResult.recommendations?.length > 0) {
      const topMatch = smResult.recommendations[0];
      const volunteerId = topMatch.candidate._id;
      const volunteer = volunteers.find(v => v._id.toString() === volunteerId);

      if (volunteer && donation.pickupLocation?.coordinates && volunteer.address?.coordinates) {
        const distance = calculateDistance(
          donation.pickupLocation.coordinates,
          volunteer.address.coordinates
        );
        console.log(`[SageMaker Match] Volunteer: ${volunteer.name}, Score: ${topMatch.score}, Distance: ${distance.toFixed(2)}km`);
        return { volunteer, distance };
      }
    }

    // --- Fallback to local AI service ---
    console.log('[AI Match] SageMaker unavailable or no results, trying local AI service...');
    const response = await axios.post(`${AI_SERVICE_URL}/rank`, {
      donation: donationData,
      candidates,
      candidateType: 'volunteer',
      topN: 3
    });

    if (response.data.success && response.data.recommendations.length > 0) {
      const topMatch = response.data.recommendations[0];
      const volunteerId = topMatch.candidate._id;
      const volunteer = volunteers.find(v => v._id.toString() === volunteerId);

      if (volunteer && donation.pickupLocation?.coordinates && volunteer.address?.coordinates) {
        const distance = calculateDistance(
          donation.pickupLocation.coordinates,
          volunteer.address.coordinates
        );
        console.log(`[Local AI Match] Volunteer: ${volunteer.name}, Score: ${topMatch.score}, Distance: ${distance.toFixed(2)}km`);
        return { volunteer, distance };
      }
    }

    console.log('[AI Match] No valid recommendations, falling back to nearest volunteer');
    return await findNearestVolunteer(donation.pickupLocation.coordinates);
  } catch (error) {
    console.error('[AI Match] Error calling AI service:', error.message);
    console.log('[AI Match] Falling back to nearest volunteer');
    if (donation.pickupLocation?.coordinates) {
      return await findNearestVolunteer(donation.pickupLocation.coordinates);
    }
    return null;
  }
}

function toRad(deg) {
  return deg * (Math.PI/180);
}

// Find nearest volunteer
async function findNearestVolunteer(donationLocation) {
  const volunteers = await User.find({
    role: 'volunteer',
    isActive: true,
    'address.coordinates': { $exists: true }
  });

  if (volunteers.length === 0) return null;

  let nearestVolunteer = volunteers[0];
  let minDistance = Infinity;

  for (const volunteer of volunteers) {
    if (volunteer.address?.coordinates) {
      const distance = calculateDistance(
        donationLocation,
        volunteer.address.coordinates
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestVolunteer = volunteer;
      }
    }
  }

  return {
    volunteer: nearestVolunteer,
    distance: minDistance
  };
}

// Preserve S3 URLs from frontend; only generate mock URLs if no real URL provided
const handleFileUpload = (files) => {
  if (!files || files.length === 0) return [];
  return files.map((file, index) => ({
    url: file.url || `https://mock-cdn.example.com/uploads/${Date.now()}_${index}.jpg`,
    filename: file.originalname || file.filename || `image_${index}.jpg`
  }));
};

// @route   POST /api/donations
// @desc    Create new donation with photo upload
// @access  Private (Donor)
router.post('/', auth, authorize('donor'), async (req, res) => {
  try {
    const donationData = {
      donor: req.user._id,
      ...req.body
    };

    // Auto-calculate priority for food donations
    if (donationData.type === 'food' && donationData.foodDetails?.expiryTime) {
      donationData.priority = calculatePriority(donationData.foodDetails.expiryTime);
    }

    // Handle photo uploads (mock)
    if (req.body.images) {
      donationData.images = handleFileUpload(req.body.images);
    }

    const donation = await Donation.create(donationData);

    // Update donor stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalDonations': 1 }
    });

    // Publish event to SQS and notify NGOs via SNS
    try {
      await awsMessaging.notifyNewDonation(donation);
    } catch (err) {
      console.error('Failed to send notifications:', err);
    }

    res.status(201).json(donation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/donations
// @desc    Get all donations (with filters)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, type, priority, myDonations } = req.query;

    // Build query based on user role
    let query = {};

    if (req.user.role === 'donor' || myDonations === 'true') {
      query.donor = req.user._id;
    } else if (req.user.role === 'ngo') {
      query.$or = [
        { status: 'pending' },
        { assignedNGO: req.user._id }
      ];
    } else if (req.user.role === 'volunteer') {
      query.$or = [
        { status: 'accepted' },
        { assignedVolunteer: req.user._id }
      ];
    }

    // Apply additional filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    let donations = await Donation.find(query)
      .populate('donor', 'name email organization')
      .populate('assignedNGO', 'name organization')
      .populate('assignedVolunteer', 'name')
      .sort({ priority: 1, createdAt: -1 });

    // Custom sort by priority (urgent first) then date
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    donations.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(donations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/donations/:id/accept
// @desc    Accept donation (NGO) with auto-assign volunteer option
// @access  Private (NGO)
router.put('/:id/accept', auth, authorize('ngo'), async (req, res) => {
  try {
    const { autoAssign } = req.body;
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'pending') {
      return res.status(400).json({ message: 'Donation already processed' });
    }

    const updates = {
      status: 'accepted',
      assignedNGO: req.user._id,
      'tracking.acceptedAt': new Date()
    };

    // Auto-assign best volunteer using AI ranking (falls back to nearest on failure)
    if (autoAssign && donation.pickupLocation?.coordinates) {
      const bestMatch = await findBestVolunteerWithAI(donation);
      if (bestMatch) {
        updates.assignedVolunteer = bestMatch.volunteer._id;
        updates.estimatedDistance = bestMatch.distance;
      }
    }

    const updatedDonation = await Donation.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    // Notify volunteers about accepted donation
    try {
      await awsMessaging.notifyDonationAccepted(updatedDonation, req.user._id);
    } catch (err) {
      console.error('Failed to send acceptance notifications:', err);
    }

    // Notify donor that their donation was accepted
    await createNotification({
      recipient: donation.donor,
      type: 'donation_accepted',
      title: 'Donation Accepted',
      message: `Your donation has been accepted by ${req.user.name || req.user.organization || 'an NGO'}`,
      data: { donationId: donation._id }
    });

    res.json(updatedDonation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/donations/:id/assign-volunteer
// @desc    Assign volunteer to donation
// @access  Private (NGO)
router.put('/:id/assign-volunteer', auth, authorize('ngo'), async (req, res) => {
  try {
    const { volunteerId } = req.body;

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const updatedDonation = await Donation.findByIdAndUpdate(
      req.params.id,
      { assignedVolunteer: volunteerId },
      { new: true }
    );

    // Create Task document so the volunteer can see it
    const task = new Task({
      donation: donation._id,
      volunteer: volunteerId,
      type: 'pickup',
      pickupLocation: donation.pickupLocation,
      deliveryLocation: donation.pickupLocation
    });
    await task.save();

    // Notify assigned volunteer
    try {
      await awsMessaging.notifyVolunteerAssigned(updatedDonation, volunteerId);
    } catch (err) {
      console.error('Failed to send volunteer notification:', err);
    }

    // Create in-app notification for volunteer
    await createNotification({
      recipient: volunteerId,
      type: 'task_assigned',
      title: 'New Pickup Task',
      message: `You have been assigned to pick up a ${donation.foodDetails?.foodType || 'food'} donation from ${donation.pickupLocation?.city || 'your area'}`,
      data: { donationId: donation._id, taskId: task._id }
    });

    res.json(updatedDonation);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/donations/:id/status
// @desc    Update donation status with photo proof
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes, photo } = req.body;
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const updates = { status };

    if (status === 'picked') {
      updates['tracking.pickedAt'] = new Date();
      updates['tracking.pickupPhoto'] = photo;
    } else if (status === 'delivered') {
      updates['tracking.deliveredAt'] = new Date();
      updates['tracking.deliveryPhoto'] = photo;
      updates['tracking.notes'] = notes;

      // Update donor stats
      await User.findByIdAndUpdate(donation.donor, {
        $inc: {
          'stats.peopleHelped': donation.impact?.peopleFed || 0,
          'stats.mealsServed': donation.impact?.mealsServed || 0
        }
      });
    }

    const updatedDonation = await Donation.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    // Notify on delivery
    if (status === 'delivered') {
      try {
        await awsMessaging.notifyDonationDelivered(updatedDonation);
      } catch (err) {
        console.error('Failed to send delivery notification:', err);
      }

      // In-app notification for donor
      await createNotification({
        recipient: donation.donor,
        type: 'delivery_complete',
        title: 'Donation Delivered',
        message: `Your donation has been successfully delivered. Thank you for helping feed those in need!`,
        data: { donationId: donation._id }
      });
    }

    res.json(updatedDonation);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/donations/:id/rate
// @desc    Rate a user (donor, volunteer, or NGO)
// @access  Private
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { userId, score, comment } = req.body;

    // Verify the donation exists and is completed
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'delivered') {
      return res.status(400).json({ message: 'Can only rate after delivery is complete' });
    }

    // Update user's average rating
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentAvg = user.rating?.average || 0;
    const currentCount = user.rating?.count || 0;
    const newAvg = ((currentAvg * currentCount) + score) / (currentCount + 1);

    user.rating = {
      average: Math.round(newAvg * 10) / 10,
      count: currentCount + 1
    };
    await user.save();

    const rating = {
      userId,
      score,
      comment,
      ratedBy: req.user._id,
      donationId: req.params.id,
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      rating
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
