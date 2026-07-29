const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  transports: [
    // Console — always on
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat,
      ),
      handleExceptions: true,
      handleRejections: true,
    }),
    // Error log file
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(timestamp(), format.json()),
    }),
    // Combined log file
    new transports.File({
      filename: path.join('logs', 'combined.log'),
      format: combine(timestamp(), format.json()),
    }),
    // Exception log file
    new transports.File({
      filename: path.join('logs', 'exceptions.log'),
      format: combine(timestamp(), format.json()),
      handleExceptions: true,
    }),
    // Rejection log file
    new transports.File({
      filename: path.join('logs', 'rejections.log'),
      format: combine(timestamp(), format.json()),
      handleRejections: true,
    }),
  ],
});

module.exports = logger;
