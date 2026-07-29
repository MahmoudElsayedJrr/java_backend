const authService = require("../services/auth.service");
const { sendSuccess } = require("../utils/response");
const { HTTP_STATUS } = require("../constants");

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const { email, code } = req.body;
      const result = await authService.verifyEmail(email, code);
      sendSuccess(res, {
        data: result,
        message: "Email verified successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  async resendVerification(req, res, next) {
    try {
      const result = await authService.resendVerification(req.body.email);
      sendSuccess(res, { data: result, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      sendSuccess(res, { data: result, message: "Login successful" });
    } catch (err) {
      next(err);
    }
  }

  async googleLogin(req, res, next) {
    try {
      const { idToken } = req.body;
      const result = await authService.googleLogin(idToken);
      sendSuccess(res, { data: result, message: "Login successful" });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      sendSuccess(res, { data: result, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, code, newPassword } = req.body;
      const result = await authService.resetPassword(email, code, newPassword);
      sendSuccess(res, { data: result, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        req.user.id,
        oldPassword,
        newPassword,
      );
      sendSuccess(res, { data: result, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.user.id, refreshToken);
      sendSuccess(res, { message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refresh(refreshToken);
      sendSuccess(res, { data: tokens, message: "Tokens refreshed" });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      sendSuccess(res, { data: user });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
