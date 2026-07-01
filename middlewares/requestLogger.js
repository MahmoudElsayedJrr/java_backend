const logger = require('../config/logger');

/**
 * HTTP request logger — logs method, url, status, response time
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level    = res.statusCode >= 500 ? 'error'
                   : res.statusCode >= 400 ? 'warn'
                   : 'info';

    logger[level](
      `${req.method} ${req.originalUrl} ${res.statusCode} — ${duration}ms`,
      {
        ip:     req.ip,
        userId: req.user?.id || '-',
      }
    );
  });

  next();
};

module.exports = requestLogger;
