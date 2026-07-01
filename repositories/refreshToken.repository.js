const BaseRepository = require('./base.repository');

class RefreshTokenRepository extends BaseRepository {
  constructor() { super('refreshToken'); }

  findValid(token) {
    return this.model.findFirst({
      where: {
        token,
        revoked:   false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  create(userId, token, expiresAt) {
    return this.model.create({
      data: { userId, token, expiresAt },
    });
  }

  revoke(token) {
    return this.model.update({
      where: { token },
      data:  { revoked: true },
    });
  }

  // Revoke all tokens for a user (used on logout-all / deactivate)
  revokeAllForUser(userId) {
    return this.model.updateMany({
      where: { userId, revoked: false },
      data:  { revoked: true },
    });
  }

  // Cleanup expired tokens — run periodically
  deleteExpired() {
    return this.model.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

module.exports = new RefreshTokenRepository();