const Joi = require("joi");

const login = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(6).required(),
});

const register = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(64).required(),
  phone: Joi.string().trim().max(20).allow("", null),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { login, register, refresh };
