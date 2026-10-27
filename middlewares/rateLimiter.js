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
 * General API rate limiter (generous for POS operational environments)
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000),   // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX       || 1500),     // 1500 requests per 15 min
  standardHeaders: true,
  legacyHeaders:   false,
  handler: _handler,
});

/**
 * Limiter for auth login & registration
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max:      parseInt(process.env.AUTH_RATE_LIMIT_MAX || 120),  // 120 attempts per window (avoids cafe Wi-Fi lockout)
  standardHeaders: true,
  legacyHeaders:   false,
  handler: _handler,
});

/**
 * Dedicated limiter for token refresh (prevents session expiry loop from blocking login)
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      500, // 500 token refreshes per window
  standardHeaders: true,
  legacyHeaders:   false,
  handler: _handler,
});

module.exports = { apiLimiter, authLimiter, refreshLimiter };
