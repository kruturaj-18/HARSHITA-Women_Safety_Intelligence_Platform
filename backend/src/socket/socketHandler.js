const logger = require('../utils/logger');
const SafetyScoreService = require('../services/safetyScore');

function setupSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('join-map', () => {
      socket.join('map-room');
      logger.debug(`Client ${socket.id} joined map-room`);
    });

    socket.on('request-area-update', async (timeRange) => {
      try {
        const areas = await SafetyScoreService.getAreaScoresForTimeRange(timeRange || 'month');
        socket.emit('area-update', areas);
      } catch (error) {
        logger.error(`Error sending area update: ${error.message}`);
        socket.emit('error', { message: 'Failed to fetch area data' });
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function broadcastNewIncident(io, incident) {
  io.to('map-room').emit('new-incident', {
    id: incident._id,
    location: incident.location,
    category: incident.category,
    severity: incident.severity,
    areaName: incident.areaName,
    incidentDate: incident.incidentDate,
    timeOfDay: incident.timeOfDay,
  });
  logger.info(`Broadcasted new incident: ${incident._id}`);
}

function broadcastScoreUpdate(io, areas) {
  io.to('map-room').emit('area-update', areas);
  logger.info('Broadcasted area score update');
}

module.exports = { setupSocket, broadcastNewIncident, broadcastScoreUpdate };
