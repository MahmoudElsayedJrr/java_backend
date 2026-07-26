const BaseRepository = require("./base.repository");

class VerificationCodeRepository extends BaseRepository {
  constructor() {
    super("verificationCode");
  }

  createCode(email, code, type, expiresAt) {
    return this.model.create({
      data: { email, code, type, expiresAt },
    });
  }

  findValid(email, code, type) {
    return this.model.findFirst({
      where: {
        email,
        code,
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  markAsUsed(id) {
    return this.model.update({
      where: { id },
      data: { used: true },
    });
  }

  deleteOldCodes(email, type) {
    return this.model.deleteMany({
      where: { email, type },
    });
  }

  deleteExpired() {
    return this.model.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

module.exports = new VerificationCodeRepository();
