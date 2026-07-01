const { HTTP_STATUS } = require('../constants');

/**
 * Base application error — always thrown from services/repositories
 * Caught by the global error middleware in middlewares/error.js
 */
class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) {
    super(message);
    this.statusCode  = statusCode;
    this.errors      = errors;
    this.isOperational = true;          // distinguish from unexpected crashes
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Convenience subclasses ──────────────────────────────────

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, errors);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};
