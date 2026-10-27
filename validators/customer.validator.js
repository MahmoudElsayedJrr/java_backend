const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  phone: Joi.string().trim().max(30).allow('', null).optional(),
  notes: Joi.string().trim().max(500).allow('', null).optional(),
});

const update = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  phone: Joi.string().trim().max(30).allow('', null).optional(),
  notes: Joi.string().trim().max(500).allow('', null).optional(),
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().trim().allow('', null).optional(),
});

module.exports = { create, update, listQuery };
