const authService       = require('../services/auth.service');
const { sendSuccess }   = require('../utils/response');
const { HTTP_STATUS }   = require('../constants');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      sendSuccess(res, {
        data:       result,
        message:    'Login successful',
        statusCode: HTTP_STATUS.OK,
      });
    } catch (err) { next(err); }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.user.id, refreshToken);
      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) { next(err); }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refresh(refreshToken);
      sendSuccess(res, { data: tokens, message: 'Tokens refreshed' });
    } catch (err) { next(err); }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      sendSuccess(res, { data: user });
    } catch (err) { next(err); }
  }
}

module.exports = new AuthController();
