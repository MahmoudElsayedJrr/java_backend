const router = require("express").Router();

const ctrl = require("../controllers/auth.controller");

const { authenticate } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { authLimiter } = require("../middlewares/rateLimiter");
const v = require("../validators/auth.validator");

// ── Public (no auth) ─────────────────────────────────────────
router.post("/register", authLimiter, validate(v.register), ctrl.register);
router.post(
  "/verify-email",
  authLimiter,
  validate(v.verifyEmail),
  ctrl.verifyEmail,
);
router.post(
  "/resend-verification",
  authLimiter,
  validate(v.resendVerification),
  ctrl.resendVerification,
);
router.post("/login", authLimiter, validate(v.login), ctrl.login);
router.post(
  "/forgot-password",
  authLimiter,
  validate(v.forgotPassword),
  ctrl.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validate(v.resetPassword),
  ctrl.resetPassword,
);
router.post("/refresh", authLimiter, validate(v.refresh), ctrl.refresh);

// ── Protected (needs auth) ────────────────────────────────────
router.post("/logout", authenticate, ctrl.logout);
router.get("/me", authenticate, ctrl.me);
router.post(
  "/change-password",
  authenticate,
  validate(v.changePassword),
  ctrl.changePassword,
);

module.exports = router;
