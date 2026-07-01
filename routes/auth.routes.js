const router      = require('express').Router();
const ctrl        = require('../controllers/auth.controller');
const { authenticate }    = require('../middlewares/auth');
const { validate }        = require('../middlewares/validate');
const { authLimiter }     = require('../middlewares/rateLimiter');
const v                   = require('../validators/auth.validator');

// POST /api/auth/login
router.post('/login',   authLimiter, validate(v.login),   ctrl.login);

// POST /api/auth/refresh
router.post('/refresh', authLimiter, validate(v.refresh), ctrl.refresh);

// POST /api/auth/logout  (requires valid access token)
router.post('/logout',  authenticate, ctrl.logout);

// GET  /api/auth/me
router.get('/me',       authenticate, ctrl.me);

module.exports = router;
