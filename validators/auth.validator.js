const Joi = require('joi');

const login = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(6).required(),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { login, refresh };
