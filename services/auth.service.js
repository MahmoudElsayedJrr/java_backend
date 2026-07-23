const bcrypt              = require('bcryptjs');
const userRepo            = require('../repositories/user.repository');
const refreshTokenRepo    = require('../repositories/refreshToken.repository');
const auditLogRepo        = require('../repositories/auditLog.repository');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { UnauthorizedError, NotFoundError, ConflictError } = require('../utils/errors');
const { AUDIT_ACTIONS }   = require('../constants');

const SALT_ROUNDS    = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class AuthService {
  /**
   * Public registration — always creates CUSTOMER role
   */
  async register(data) {
    const existing = await userRepo.findByEmail(data.email);
    if (existing) throw new ConflictError('Email already in use');

    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await userRepo.createUser({
      name:     data.name,
      email:    data.email,
      password: hashed,
      role:     'CUSTOMER',   // always CUSTOMER for public registration
      active:   true,
    });

    // Auto-login after register
    const payload      = { id: user.id, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt    = new Date(Date.now() + REFRESH_TTL_MS);
    await refreshTokenRepo.create(user.id, refreshToken, expiresAt);

    await auditLogRepo.log({
      userId:   user.id,
      action:   'CUSTOMER_REGISTERED',
      entity:   'User',
      entityId: user.id,
      metadata: { name: user.name, email: user.email },
    });

    return { user, accessToken, refreshToken };
  }

  /**
   * Login
   */
  async login(email, password) {
    const user = await userRepo.findByEmail(email);
    if (!user)        throw new UnauthorizedError('Invalid email or password');
    if (!user.active) throw new UnauthorizedError('Account is deactivated');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    const payload      = { id: user.id, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt    = new Date(Date.now() + REFRESH_TTL_MS);
    await refreshTokenRepo.create(user.id, refreshToken, expiresAt);

    await auditLogRepo.log({
      userId:   user.id,
      action:   AUDIT_ACTIONS.LOGIN,
      entity:   'User',
      entityId: user.id,
    });

    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  /**
   * Logout
   */
  async logout(userId, refreshToken) {
    if (refreshToken) {
      await refreshTokenRepo.revoke(refreshToken).catch(() => null);
    }
    await auditLogRepo.log({
      userId,
      action:   AUDIT_ACTIONS.LOGOUT,
      entity:   'User',
      entityId: userId,
    });
  }

  /**
   * Refresh tokens
   */
  async refresh(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    const stored  = await refreshTokenRepo.findValid(refreshToken);
    if (!stored) throw new UnauthorizedError('Invalid or expired refresh token');

    const user = await userRepo.findByIdSafe(decoded.id);
    if (!user || !user.active) throw new UnauthorizedError('Account is deactivated');

    await refreshTokenRepo.revoke(refreshToken);
    const newAccessToken  = signAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id, role: user.role });
    const expiresAt       = new Date(Date.now() + REFRESH_TTL_MS);
    await refreshTokenRepo.create(user.id, newRefreshToken, expiresAt);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Get current user profile
   */
  async getMe(userId) {
    const user = await userRepo.findByIdSafe(userId);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
}

module.exports = new AuthService();