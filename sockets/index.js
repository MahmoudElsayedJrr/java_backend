const { Server } = require('socket.io');
const logger     = require('../config/logger');
const { verifyAccessToken, extractBearerToken } = require('../utils/jwt');

let io = null;

/**
 * Initialize Socket.IO on the HTTP server
 * Called once from server.js
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:  process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  // JWT auth middleware for socket connections
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader) return next(new Error('Authentication required'));

      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      if (!token) return next(new Error('Authentication required'));

      const decoded    = verifyAccessToken(token);
      socket.user      = decoded;
      next();
    } catch (e) {
      logger.error(`[Socket Auth Error] ${e.message}`);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`[Socket] Connected: ${socket.id} | User: ${socket.user?.id}`);

    // Join role-based rooms so we can target events
    if (socket.user?.role) {
      socket.join(socket.user.role);        // 'ADMIN' or 'CASHIER'
      socket.join(`user:${socket.user.id}`); // personal room
    }

    socket.on('disconnect', () => {
      logger.info(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
};


const getIO = () => io;

module.exports = { initSocket, getIO };