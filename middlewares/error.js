const logger              = require('../config/logger');
const { AppError }        = require('../utils/errors');
const { sendError }       = require('../utils/response');
const { HTTP_STATUS }     = require('../constants');

/**
 * Global error handler — must be the LAST middleware in app.js
 * Catches everything thrown from controllers/services
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Log all errors
  logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, {
    stack:  err.stack,
    userId: req.user?.id || 'unauthenticated',
    body:   req.body,
  });

  // Known operational errors (AppError subclasses)
  if (err.isOperational) {
    return sendError(res, {
      message:    err.message,
      statusCode: err.statusCode,
      errors:     err.errors || null,
    });
  }

  // Prisma known errors
  if (err.code) {
    const prismaError = _handlePrismaError(err);
    if (prismaError) return sendError(res, prismaError);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    return sendError(res, {
      message:    err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message,
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }

  // JWT errors (shouldn't reach here, but just in case)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, {
      message:    'Invalid or expired token',
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
  }

  // Unknown / unexpected errors — never expose internals
  return sendError(res, {
    message:    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });
};

/**
 * 404 handler — for unmatched routes
 */
const notFoundHandler = (req, res) => {
  return sendError(res, {
    message:    `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: HTTP_STATUS.NOT_FOUND,
  });
};

// ── Private ─────────────────────────────────────────────────

const _handlePrismaError = (err) => {
  switch (err.code) {
    case 'P2002': // Unique constraint
      return {
        message:    `Duplicate value for: ${err.meta?.target?.join(', ')}`,
        statusCode: HTTP_STATUS.CONFLICT,
      };
    case 'P2025': // Record not found
      return {
        message:    'Record not found',
        statusCode: HTTP_STATUS.NOT_FOUND,
      };
    case 'P2003': // Foreign key constraint
      return {
        message:    'Related record not found',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    case 'P2014': // Required relation violated
      return {
        message:    'Invalid relation',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    default:
      return null;
  }
};

module.exports = { errorHandler, notFoundHandler };
