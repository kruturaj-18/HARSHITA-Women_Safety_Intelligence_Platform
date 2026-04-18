const express = require('express');
const Area = require('../models/Area');
const PoliceStation = require('../models/PoliceStation');
const SafetyScoreService = require('../services/safetyScore');

const router = express.Router();

// GET /api/map/areas - Get all areas with safety scores as GeoJSON
router.get('/areas', async (req, res, next) => {
  try {
    const { timeRange = 'month' } = req.query;
    const areas = await SafetyScoreService.getAreaScoresForTimeRange(timeRange);

    const geojson = {
      type: 'FeatureCollection',
      features: areas.map((area) => ({
        type: 'Feature',
        properties: {
          name: area.name,
          safetyScore: area.safetyScore,
          riskLevel: area.riskLevel,
          totalIncidents: area.totalIncidents || 0,
          recentIncidents: area.recentIncidents || 0,
          incidentCount: area.incidentCount || 0,
        },
        geometry: area.geometry,
      })),
    };

    res.json({ success: true, data: geojson });
  } catch (error) {
    next(error);
  }
});

// GET /api/map/police-stations
router.get('/police-stations', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    let stations;

    if (lat && lng) {
      stations = await PoliceStation.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
          },
        },
      }).limit(50);
    } else {
      stations = await PoliceStation.find({}).limit(50);
    }

    const geojson = {
      type: 'FeatureCollection',
      features: stations.map((s) => ({
        type: 'Feature',
        properties: {
          id: s._id,
          name: s.name,
          address: s.address,
          phone: s.phone,
          jurisdiction: s.jurisdiction,
          isWomenCell: s.isWomenCell,
        },
        geometry: s.location,
      })),
    };

    res.json({ success: true, data: geojson });
  } catch (error) {
    next(error);
  }
});

// GET /api/map/nearest-station
router.get('/nearest-station', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng required' });
    }

    const station = await PoliceStation.findOne({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
        },
      },
    });

    res.json({ success: true, data: { station } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
