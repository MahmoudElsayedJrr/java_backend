const Joi = require("joi");
const { PAYMENT_METHOD, ORDER_STATUS } = require("../constants");

const orderItem = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).required(),
  notes: Joi.string().trim().max(300).allow("", null),
  flavorIds: Joi.array().items(Joi.string().uuid()).default([]),
});

const create = Joi.object({
  items: Joi.array().items(orderItem).min(1).required(),
  paymentMethod: Joi.string()
    .valid(...Object.values(PAYMENT_METHOD))
    .default(PAYMENT_METHOD.CASH),
  discount: Joi.number().min(0).max(100).precision(2).default(0), // percentage 0–100
  notes: Joi.string().trim().max(500).allow("", null),
});

const updateStatus = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .required(),
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...Object.values(ORDER_STATUS)),
  cashierId: Joi.string().uuid(),
  from: Joi.date().iso(),
  to: Joi.date().iso().min(Joi.ref("from")),
});

module.exports = { create, updateStatus, listQuery };
