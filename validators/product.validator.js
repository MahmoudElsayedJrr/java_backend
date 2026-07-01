const Joi = require('joi');

const create = Joi.object({
  categoryId:   Joi.string().uuid().required(),
  name:         Joi.string().trim().min(2).max(150).required(),
  description:  Joi.string().trim().max(500).allow('', null),
  basePrice:    Joi.number().positive().precision(2).required(),
  active:       Joi.boolean().default(true),
  flavorIds:    Joi.array().items(Joi.string().uuid()).default([]),
  initialStock: Joi.number().integer().min(0).default(0),
  lowStock:     Joi.number().integer().min(0).default(10),
});

const update = Joi.object({
  categoryId:  Joi.string().uuid(),
  name:        Joi.string().trim().min(2).max(150),
  description: Joi.string().trim().max(500).allow('', null),
  basePrice:   Joi.number().positive().precision(2),
  active:      Joi.boolean(),
  flavorIds:   Joi.array().items(Joi.string().uuid()),
}).min(1);

const listQuery = Joi.object({
  page:       Joi.number().integer().min(1).default(1),
  limit:      Joi.number().integer().min(1).max(100).default(10),
  active:     Joi.string().valid('true', 'false'),
  categoryId: Joi.string().uuid(),
});

module.exports = { create, update, listQuery };
