const Joi = require('joi');

const TYPES = ['INSTAPAY', 'VODAFONE_CASH'];

const create = Joi.object({
  type:      Joi.string().valid(...TYPES).required(),
  number: Joi.string()
  .pattern(/^(010|011|012|015)\d{8}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Egyptian phone number',
  }),
  name:      Joi.string().trim().min(2).max(100).required(),
  isDefault: Joi.boolean().default(false),
});

const update = Joi.object({
  number: Joi.string()
  .pattern(/^(010|011|012|015)\d{8}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Egyptian phone number',
  }),
  name:      Joi.string().trim().min(2).max(100),
  isDefault: Joi.boolean(),
  active:    Joi.boolean(),
}).min(1);

const listQuery = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  type:  Joi.string().valid(...TYPES),
});

module.exports = { create, update, listQuery };