const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { authLimiter } = require("../middlewares/rateLimiter");
const v = require("../validators/auth.validator");

// Public — no auth needed
router.post("/register", authLimiter, validate(v.register), ctrl.register);
router.post("/login", authLimiter, validate(v.login), ctrl.login);
router.post("/refresh", authLimiter, validate(v.refresh), ctrl.refresh);

// Protected
router.post("/logout", authenticate, ctrl.logout);
router.get("/me", authenticate, ctrl.me);

module.exports = router;
