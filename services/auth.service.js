const bcrypt              = require('bcryptjs');
const userRepo            = require('../repositories/user.repository');
const refreshTokenRepo    = require('../repositories/refreshToken.repository');
const auditLogRepo        = require('../repositories/auditLog.repository');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { UnauthorizedError, NotFoundError } = require('../utils/errors');
const { AUDIT_ACTIONS }   = require('../constants');

// Refresh token TTL in ms — must match JWT_REFRESH_EXPIRES_IN
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class AuthService {
  /**
   * Login — validate credentials, return access + refresh tokens
   */
  async login(email, password) {
    // 1. Find user (include password for comparison)
    const user = await userRepo.findByEmail(email);
    if (!user)        throw new UnauthorizedError('Invalid email or password');
    if (!user.active) throw new UnauthorizedError('Account is deactivated');

    // 2. Compare password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    // 3. Sign tokens
    const payload      = { id: user.id, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 4. Persist refresh token
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await refreshTokenRepo.create(user.id, refreshToken, expiresAt);

    // 5. Audit log
    await auditLogRepo.log({
      userId:   user.id,
      action:   AUDIT_ACTIONS.LOGIN,
      entity:   'User',
      entityId: user.id,
    });

    // 6. Return — never expose password
    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  /**
   * Logout — revoke the refresh token
   */
  async logout(userId, refreshToken) {
    if (refreshToken) {
      await refreshTokenRepo.revoke(refreshToken).catch(() => null); // silent fail
    }
    await auditLogRepo.log({
      userId,
      action:   AUDIT_ACTIONS.LOGOUT,
      entity:   'User',
      entityId: userId,
    });
  }

  /**
   * Refresh — rotate refresh token, return new access token
   */
  async refresh(refreshToken) {
    // 1. Verify JWT signature
    const decoded = verifyRefreshToken(refreshToken);

    // 2. Check DB — token must exist, not revoked, not expired
    const stored = await refreshTokenRepo.findValid(refreshToken);
    if (!stored) throw new UnauthorizedError('Invalid or expired refresh token');

    // 3. Check user still active
    const user = await userRepo.findByIdSafe(decoded.id);
    if (!user || !user.active) throw new UnauthorizedError('Account is deactivated');

    // 4. Rotate — revoke old, issue new
    await refreshTokenRepo.revoke(refreshToken);
    const newAccessToken  = signAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id, role: user.role });
    const expiresAt       = new Date(Date.now() + REFRESH_TTL_MS);
    await refreshTokenRepo.create(user.id, newRefreshToken, expiresAt);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Get current authenticated user profile
   */
  async getMe(userId) {
    const user = await userRepo.findByIdSafe(userId);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
}

module.exports = new AuthService();
