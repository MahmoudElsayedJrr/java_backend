const Joi = require('joi');

const create = Joi.object({
  name:   Joi.string().trim().min(2).max(100).required(),
  active: Joi.boolean().default(true),
});

const update = Joi.object({
  name:   Joi.string().trim().min(2).max(100),
  active: Joi.boolean(),
}).min(1);

const listQuery = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(10),
  active: Joi.string().valid('true', 'false'),
});

module.exports = { create, update, listQuery };
