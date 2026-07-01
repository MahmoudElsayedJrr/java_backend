const { verifyAccessToken, extractBearerToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError }     = require('../utils/errors');
const prisma = require('../config/prisma');

/**
 * Protect route — verifies JWT and attaches req.user
 */
const authenticate = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) throw new UnauthorizedError('No token provided');

    const decoded = verifyAccessToken(token);

    // Fetch fresh user from DB (catches deactivated accounts mid-session)
    const user = await prisma.user.findUnique({
      where:  { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    if (!user)         throw new UnauthorizedError('User not found');
    if (!user.active)  throw new UnauthorizedError('Account is deactivated');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * RBAC — restrict to specific roles
 * Usage: authorize('ADMIN') or authorize('ADMIN', 'CASHIER')
 */
const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError('Not authenticated'));

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
