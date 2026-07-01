const Joi  = require('joi');
const { ROLES } = require('../constants');

const create = Joi.object({
  name:     Joi.string().trim().min(2).max(100).required(),
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(64).required(),
  role:     Joi.string().valid(...Object.values(ROLES)).required(),
});

const update = Joi.object({
  name:     Joi.string().trim().min(2).max(100),
  email:    Joi.string().email().lowercase().trim(),
  password: Joi.string().min(8).max(64),
  role:     Joi.string().valid(...Object.values(ROLES)),
  active:   Joi.boolean(),
}).min(1); // at least one field required

const listQuery = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(10),
  role:   Joi.string().valid(...Object.values(ROLES)),
  active: Joi.string().valid('true', 'false'),
});

module.exports = { create, update, listQuery };
