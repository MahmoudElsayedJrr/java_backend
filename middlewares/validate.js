const { ValidationError } = require('../utils/errors');

/**
 * Validate req.body against a Joi schema
 * Usage: validate(mySchema)
 */
const validate = (schema) => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly:    false,   // return all errors, not just the first
      stripUnknown:  true,    // remove unknown keys silently
      allowUnknown:  false,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field:   d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return next(new ValidationError('Validation failed', errors));
    }

    // Replace req.body with the sanitized/coerced value from Joi
    req.body = value;
    next();
  };
};

/**
 * Validate req.query against a Joi schema
 */
const validateQuery = (schema) => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly:   false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field:   d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return next(new ValidationError('Query validation failed', errors));
    }

    req.query = value;
    next();
  };
};

module.exports = { validate, validateQuery };
