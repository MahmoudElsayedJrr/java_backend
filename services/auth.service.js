const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const userRepo = require("../repositories/user.repository");
const refreshTokenRepo = require("../repositories/refreshToken.repository");
const auditLogRepo = require("../repositories/auditLog.repository");
const codeRepo = require("../repositories/verificationCode.repository");

const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("./email.service");

const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require("../utils/errors");

const { AUDIT_ACTIONS } = require("../constants");

const SALT_ROUNDS = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 2 * 60 * 1000;

// Generate 6-digit code
const _generateCode = () => crypto.randomInt(100000, 999999).toString();

class AuthService {
  // ── Register ──────────────────────────────────────────────
  async register(data) {
    const existing = await userRepo.findByEmail(data.email);
    if (existing) throw new ConflictError("Email already in use");

    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await userRepo.createUser({
      name: data.name,
      email: data.email,
      password: hashed,
      role: "CUSTOMER",
      active: false,
      emailVerified: false,
    });

    try {
      await _sendCode(user.email, user.name, "EMAIL_VERIFICATION");
    } catch (err) {
      await userRepo.delete(user.id);
      throw err;
    }

    return {
      message:
        "Account created. Please check your email for the verification code.",
      email: user.email,
    };
  }

  // ── Verify Email ──────────────────────────────────────────
  async verifyEmail(email, code) {
    const record = await codeRepo.findValid(email, code, "EMAIL_VERIFICATION");
    if (!record)
      throw new BadRequestError("Invalid or expired verification code");

    // Mark code as used
    await codeRepo.markAsUsed(record.id);

    // Activate user
    const user = await userRepo.updateUser(
      (await userRepo.findByEmail(email)).id,
      { emailVerified: true, active: true },
    );

    // Auto-login after verification
    const payload = { id: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await refreshTokenRepo.create(user.id, refreshToken, expiresAt);

    await auditLogRepo.log({
      userId: user.id,
      action: "EMAIL_VERIFIED",
      entity: "User",
      entityId: user.id,
    });

    return { user, accessToken, refreshToken };
  }

  // ── Resend Verification Code ──────────────────────────────
  async resendVerification(email) {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new NotFoundError("Email not found");
    if (user.emailVerified) throw new BadRequestError("Email already verified");

    await _sendCode(email, user.name, "EMAIL_VERIFICATION");
    return { message: "Verification code sent" };
  }

  // ── Login ─────────────────────────────────────────────────
  async login(email, password) {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedError("Invalid email or password");
    if (user.role === "CUSTOMER" && !user.emailVerified) {
      try {
        await _sendCode(email, user.name, "EMAIL_VERIFICATION");
      } catch (err) {
        // Silent fail to ensure error response goes through
      }
      throw new UnauthorizedError("Please verify your email first");
    }
    if (!user.active) throw new UnauthorizedError("Account is deactivated");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const payload = { id: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await refreshTokenRepo.create(user.id, refreshToken, expiresAt);

    await auditLogRepo.log({
      userId: user.id,
      action: AUDIT_ACTIONS.LOGIN,
      entity: "User",
      entityId: user.id,
    });

    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  // ── Forgot Password ───────────────────────────────────────
  async forgotPassword(email) {
    const user = await userRepo.findByEmail(email);

    // لو مش موجود مش بنقول للمستخدم — أمان
    if (!user)
      return { message: "If this email exists, a reset code has been sent" };

    await _sendCode(email, user.name, "PASSWORD_RESET");
    return { message: "If this email exists, a reset code has been sent" };
  }

  // ── Reset Password ────────────────────────────────────────
  async resetPassword(email, code, newPassword) {
    const record = await codeRepo.findValid(email, code, "PASSWORD_RESET");
    if (!record) throw new BadRequestError("Invalid or expired reset code");

    await codeRepo.markAsUsed(record.id);

    const user = await userRepo.findByEmail(email);
    if (!user) throw new NotFoundError("User not found");

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepo.updateUser(user.id, { password: hashed });

    // Revoke all refresh tokens for security
    await refreshTokenRepo.revokeAllForUser(user.id);

    await auditLogRepo.log({
      userId: user.id,
      action: "PASSWORD_RESET",
      entity: "User",
      entityId: user.id,
    });

    return { message: "Password reset successfully. Please login again." };
  }

  // ── Change Password (logged in) ───────────────────────────
  async changePassword(userId, oldPassword, newPassword) {
    const user = await userRepo.findByEmail(
      (await userRepo.findByIdSafe(userId)).email,
    );

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new BadRequestError("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepo.updateUser(userId, { password: hashed });

    // Revoke all refresh tokens
    await refreshTokenRepo.revokeAllForUser(userId);

    await auditLogRepo.log({
      userId,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: userId,
    });

    return { message: "Password changed successfully. Please login again." };
  }

  // ── Logout ────────────────────────────────────────────────
  async logout(userId, refreshToken) {
    if (refreshToken) {
      await refreshTokenRepo.revoke(refreshToken).catch(() => null);
    }
    await auditLogRepo.log({
      userId,
      action: AUDIT_ACTIONS.LOGOUT,
      entity: "User",
      entityId: userId,
    });
  }

  // ── Refresh ───────────────────────────────────────────────
  async refresh(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    const stored = await refreshTokenRepo.findValid(refreshToken);
    if (!stored)
      throw new UnauthorizedError("Invalid or expired refresh token");

    const user = await userRepo.findByIdSafe(decoded.id);
    if (!user || !user.active)
      throw new UnauthorizedError("Account is deactivated");

    await refreshTokenRepo.revoke(refreshToken);
    const newAccessToken = signAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id, role: user.role });
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await refreshTokenRepo.create(user.id, newRefreshToken, expiresAt);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ── Get Me ────────────────────────────────────────────────
  async getMe(userId) {
    const user = await userRepo.findByIdSafe(userId);
    if (!user) throw new NotFoundError("User not found");
    return user;
  }
}

// ── Private helper ────────────────────────────────────────────
async function _sendCode(email, name, type) {
  // احذف الأكواد القديمة الأول
  await codeRepo.deleteOldCodes(email, type);

  const code = _generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await codeRepo.createCode(email, code, type, expiresAt);

  if (type === "EMAIL_VERIFICATION") {
    await sendVerificationEmail(email, name, code);
  } else {
    await sendPasswordResetEmail(email, name, code);
  }
}

module.exports = new AuthService();
