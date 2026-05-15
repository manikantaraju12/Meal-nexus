const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Donation = require('../models/Donation');
const { auth, authorize } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationHelper');

// @route   GET /api/tasks
// @desc    Get tasks for volunteer
// @access  Private (Volunteer)
router.get('/', auth, authorize('volunteer'), async (req, res) => {
  try {
    const tasks = await Task.find({ volunteer: req.user.id })
      .populate('donation')
      .sort({ assignedAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tasks
// @desc    Create task (assign volunteer)
// @access  Private (NGO/Admin)
router.post('/', auth, authorize('ngo', 'admin'), async (req, res) => {
  try {
    const { donationId, volunteerId, type } = req.body;
    
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const task = new Task({
      donation: donationId,
      volunteer: volunteerId,
      type,
      pickupLocation: donation.pickupLocation,
      deliveryLocation: req.body.deliveryLocation || donation.pickupLocation
    });

    await task.save();

    // Update donation
    donation.assignedVolunteer = volunteerId;
    await donation.save();

    // Notify volunteer
    await createNotification({
      recipient: volunteerId,
      type: 'task_assigned',
      title: 'New Pickup Task',
      message: `You have been assigned to pick up a ${donation.foodDetails?.foodType || 'food'} donation from ${donation.pickupLocation?.city || 'your area'}`,
      data: { donationId: donation._id, taskId: task._id }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id/start
// @desc    Start task
// @access  Private (Volunteer)
router.put('/:id/start', auth, authorize('volunteer'), async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, volunteer: req.user.id });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = 'in-progress';
    task.startedAt = new Date();
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id/complete
// @desc    Complete task with proof
// @access  Private (Volunteer)
router.put('/:id/complete', auth, authorize('volunteer'), async (req, res) => {
  try {
    const { photo, recipientName, notes } = req.body;
    const task = await Task.findOne({ _id: req.params.id, volunteer: req.user.id });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.proof = {
      deliveryPhoto: photo,
      recipientName,
      notes
    };
    await task.save();

    // Update donation status
    const updatedDonation = await Donation.findByIdAndUpdate(task.donation, {
      status: 'delivered',
      'tracking.deliveredAt': new Date(),
      'tracking.deliveryPhoto': photo,
      'tracking.notes': notes
    }, { new: true });

    // Notify donor and NGO
    if (updatedDonation) {
      await createNotification({
        recipient: updatedDonation.donor,
        type: 'delivery_complete',
        title: 'Donation Delivered',
        message: 'Your donation has been successfully delivered. Thank you for your contribution!',
        data: { donationId: updatedDonation._id }
      });

      if (updatedDonation.assignedNGO) {
        await createNotification({
          recipient: updatedDonation.assignedNGO,
          type: 'delivery_complete',
          title: 'Task Completed',
          message: `A volunteer has completed the delivery for a donation`,
          data: { donationId: updatedDonation._id }
        });
      }
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
