const Incident = require('../models/Incident');
const Area = require('../models/Area');
const logger = require('../utils/logger');

class SafetyScoreService {
  static getRecencyWeight(date) {
    const now = new Date();
    const diffHours = (now - new Date(date)) / (1000 * 60 * 60);
    if (diffHours <= 24) return 1.0;
    if (diffHours <= 168) return 0.7;  // 1 week
    if (diffHours <= 720) return 0.4;  // 1 month
    return 0.1;
  }

  static getTimeOfDayFactor(timeOfDay) {
    return (timeOfDay === 'night' || timeOfDay === 'evening') ? 1.5 : 1.0;
  }

  static getSeverityFactor(severity) {
    const factors = { low: 1.0, medium: 2.0, high: 3.5 };
    return factors[severity] || 1.0;
  }

  static async computeAreaScore(areaName) {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const incidents = await Incident.find({
        areaName: areaName,
        status: 'approved',
        incidentDate: { $gte: sixMonthsAgo },
      });

      if (incidents.length === 0) return { score: 85, riskLevel: 'safe', totalIncidents: 0, recentIncidents: 0 };

      let totalWeight = 0;
      let recentCount = 0;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      incidents.forEach((incident) => {
        const recency = this.getRecencyWeight(incident.incidentDate);
        const timeOfDay = this.getTimeOfDayFactor(incident.timeOfDay);
        const severity = this.getSeverityFactor(incident.severity);
        totalWeight += recency * timeOfDay * severity;

        if (incident.incidentDate >= oneDayAgo) recentCount++;
      });

      const normalizedWeight = Math.min(totalWeight / 10, 100);
      const score = Math.max(0, Math.round(100 - normalizedWeight));

      let riskLevel = 'safe';
      if (score < 40) riskLevel = 'high_risk';
      else if (score < 70) riskLevel = 'moderate';

      return {
        score,
        riskLevel,
        totalIncidents: incidents.length,
        recentIncidents: recentCount,
      };
    } catch (error) {
      logger.error(`Error computing safety score for ${areaName}: ${error.message}`);
      return { score: 50, riskLevel: 'moderate', totalIncidents: 0, recentIncidents: 0 };
    }
  }

  static async updateAllAreaScores() {
    try {
      const areas = await Area.find({});
      const updates = [];

      for (const area of areas) {
        const { score, riskLevel, totalIncidents, recentIncidents } = await this.computeAreaScore(area.name);
        area.safetyScore = score;
        area.riskLevel = riskLevel;
        area.totalIncidents = totalIncidents;
        area.recentIncidents = recentIncidents;
        area.lastUpdated = new Date();
        updates.push(area.save());
      }

      await Promise.all(updates);
      logger.info(`Updated safety scores for ${areas.length} areas`);
      return areas;
    } catch (error) {
      logger.error(`Error updating area scores: ${error.message}`);
      throw error;
    }
  }

  static async getAreaScoresForTimeRange(timeRange) {
    const areas = await Area.find({});
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'live':
        startDate = new Date(now - 2 * 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const result = [];
    for (const area of areas) {
      const incidents = await Incident.find({
        areaName: area.name,
        status: 'approved',
        incidentDate: { $gte: startDate },
      });

      let totalWeight = 0;
      incidents.forEach((inc) => {
        const recency = this.getRecencyWeight(inc.incidentDate);
        const tod = this.getTimeOfDayFactor(inc.timeOfDay);
        const sev = this.getSeverityFactor(inc.severity);
        totalWeight += recency * tod * sev;
      });

      const normalizedWeight = Math.min(totalWeight / 10, 100);
      const score = Math.max(0, Math.round(100 - normalizedWeight));
      let riskLevel = 'safe';
      if (score < 40) riskLevel = 'high_risk';
      else if (score < 70) riskLevel = 'moderate';

      result.push({
        ...area.toJSON(),
        safetyScore: score,
        riskLevel,
        incidentCount: incidents.length,
      });
    }

    return result;
  }
}

module.exports = SafetyScoreService;
