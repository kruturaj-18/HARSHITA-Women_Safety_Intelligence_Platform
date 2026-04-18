const express = require('express');
const Incident = require('../models/Incident');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { incidentValidation, paginationValidation } = require('../middleware/validate');
const { reportLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/incidents - Report an incident
router.post('/', reportLimiter, optionalAuth, incidentValidation, async (req, res, next) => {
  try {
    const { longitude, latitude, category, severity, description, areaName, isAnonymous } = req.body;

    const incidentData = {
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      category,
      severity: severity || 'medium',
      description,
      areaName: areaName || '',
      isAnonymous: isAnonymous || !req.user,
      reportedBy: (!isAnonymous && req.user) ? req.user._id : null,
      status: 'pending',
      incidentDate: new Date(),
    };

    const incident = await Incident.create(incidentData);

    logger.info(`New incident reported: ${incident._id} in ${areaName || 'unknown area'}`);

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully. It will be reviewed by moderators.',
      data: { incident },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/incidents - Get approved incidents with filters
router.get('/', paginationValidation, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      timeRange,
      category,
      severity,
      lat,
      lng,
      radius,
      areaName,
    } = req.query;

    const query = { status: 'approved' };

    // Time range filter
    if (timeRange) {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case 'live': startDate = new Date(now - 2 * 60 * 60 * 1000); break;
        case 'day': startDate = new Date(now - 24 * 60 * 60 * 1000); break;
        case 'week': startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
        case 'month': startDate = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      }
      if (startDate) query.incidentDate = { $gte: startDate };
    }

    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (areaName) query.areaName = areaName;

    // Geo query
    if (lat && lng && radius) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius, 10),
        },
      };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const incidents = await Incident.find(query)
      .sort({ incidentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .select('-reportedBy');

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

// GET /api/incidents/heatmap - Get data for heatmap visualization
router.get('/heatmap', async (req, res, next) => {
  try {
    const { timeRange = 'month' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'live': startDate = new Date(now - 2 * 60 * 60 * 1000); break;
      case 'day': startDate = new Date(now - 24 * 60 * 60 * 1000); break;
      case 'week': startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const incidents = await Incident.find({
      status: 'approved',
      incidentDate: { $gte: startDate },
    }).select('location severity category');

    const heatmapData = incidents.map((inc) => ({
      lng: inc.location.coordinates[0],
      lat: inc.location.coordinates[1],
      weight: inc.severity === 'high' ? 3 : inc.severity === 'medium' ? 2 : 1,
    }));

    res.json({
      success: true,
      data: { points: heatmapData, total: heatmapData.length },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
