const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');
const { HTTP_STATUS } = require('../constants');

const _handler = (_req, res) => {
  sendError(res, {
    message:    'Too many requests, please try again later.',
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  });
};

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000),   // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX       || 100),
  standardHeaders: true,
  legacyHeaders:   false,
  handler: _handler,
});

/**
 * Strict limiter for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max:      10,               // 10 login attempts per window
  standardHeaders: true,
  legacyHeaders:   false,
  handler: _handler,
});

module.exports = { apiLimiter, authLimiter };
