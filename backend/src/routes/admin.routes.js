const express = require('express');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Area = require('../models/Area');
const { authenticate, authorize } = require('../middleware/auth');
const { moderateValidation, paginationValidation } = require('../middleware/validate');
const SafetyScoreService = require('../services/safetyScore');
const logger = require('../utils/logger');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalIncidents,
      pendingIncidents,
      approvedIncidents,
      rejectedIncidents,
      totalUsers,
      highRiskAreas,
    ] = await Promise.all([
      Incident.countDocuments({}),
      Incident.countDocuments({ status: 'pending' }),
      Incident.countDocuments({ status: 'approved' }),
      Incident.countDocuments({ status: 'rejected' }),
      User.countDocuments({}),
      Area.countDocuments({ riskLevel: 'high_risk' }),
    ]);

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentIncidents = await Incident.countDocuments({
      createdAt: { $gte: lastWeek },
    });

    // Category breakdown
    const categoryStats = await Incident.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Daily trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyTrend = await Incident.aggregate([
      { $match: { status: 'approved', incidentDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$incidentDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Area-wise stats
    const areaStats = await Incident.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$areaName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalIncidents,
          pendingIncidents,
          approvedIncidents,
          rejectedIncidents,
          totalUsers,
          highRiskAreas,
          recentIncidents,
        },
        categoryStats,
        dailyTrend,
        areaStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/incidents - Get all incidents (including pending)
router.get('/incidents', paginationValidation, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name email')
      .populate('moderatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Incident.countDocuments(query);

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/incidents/:id/moderate - Approve or reject incident
router.patch('/incidents/:id/moderate', moderateValidation, async (req, res, next) => {
  try {
    const { status } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    incident.status = status;
    incident.moderatedBy = req.user._id;
    incident.moderatedAt = new Date();
    await incident.save();

    logger.info(`Incident ${incident._id} ${status} by admin ${req.user.email}`);

    // If approved, update area safety scores and broadcast
    if (status === 'approved' && incident.areaName) {
      await SafetyScoreService.computeAreaScore(incident.areaName);
    }

    // Return the io instance for broadcasting if available
    const io = req.app.get('io');
    if (io && status === 'approved') {
      const { broadcastNewIncident } = require('../socket/socketHandler');
      broadcastNewIncident(io, incident);
    }

    res.json({
      success: true,
      message: `Incident ${status} successfully.`,
      data: { incident },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users - User management
router.get('/users', paginationValidation, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const users = await User.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await User.countDocuments({});

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/users/:id/toggle - Toggle user active status
router.patch('/users/:id/toggle', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isActive = !user.isActive;
    await user.save();

    logger.info(`User ${user.email} ${user.isActive ? 'activated' : 'deactivated'} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}.`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/recalculate-scores
router.post('/recalculate-scores', async (req, res, next) => {
  try {
    const areas = await SafetyScoreService.updateAllAreaScores();
    res.json({
      success: true,
      message: `Safety scores recalculated for ${areas.length} areas.`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
