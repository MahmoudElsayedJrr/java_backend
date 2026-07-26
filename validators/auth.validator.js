const Joi = require("joi");

const login = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(6).required(),
});

const register = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(64).required(),
});

const verifyEmail = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  code: Joi.string().length(6).required(),
});

const resendVerification = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const resetPassword = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  code: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).max(64).required(),
});

const changePassword = Joi.object({
  oldPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(8).max(64).required(),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = {
  login,
  register,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refresh,
};
