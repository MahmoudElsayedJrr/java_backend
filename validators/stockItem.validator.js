const Joi = require("joi");

const UNITS = [
  "piece",
  "kg",
  "gram",
  "liter",
  "ml",
  "box",
  "bag",
  "carton",
  "bottle",
  "pack",
];

const create = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  unit: Joi.string()
    .valid(...UNITS)
    .default("piece"),
  quantity: Joi.number().min(0).precision(2).default(0),
  lowStock: Joi.number().min(0).precision(2).default(10),
  notes: Joi.string().trim().max(500).allow("", null),
});

const update = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  unit: Joi.string().valid(...UNITS),
  quantity: Joi.number().min(0).precision(2),
  lowStock: Joi.number().min(0).precision(2),
  notes: Joi.string().trim().max(500).allow("", null),
}).min(1);

const adjustQuantity = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

module.exports = { create, update, adjustQuantity, listQuery, UNITS };
