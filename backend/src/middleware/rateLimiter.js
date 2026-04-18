const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.logSuspicious('Rate limit exceeded', { ip: req.ip, path: req.originalUrl });
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.logSuspicious('Auth rate limit exceeded', { ip: req.ip });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    });
  },
});

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many reports submitted. Please try again later.',
  },
});

module.exports = { globalLimiter, authLimiter, reportLimiter };
