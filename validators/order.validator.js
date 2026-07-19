const Joi = require('joi');
const { PAYMENT_METHOD, ORDER_STATUS, ORDER_TYPE } = require('../constants');

const orderItem = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity:  Joi.number().integer().min(1).required(),
  notes:     Joi.string().trim().max(300).allow('', null),
  flavorIds: Joi.array().items(Joi.string().uuid()).default([]),
});

const create = Joi.object({
  items: Joi.array().items(orderItem).min(1).required(),

  orderType: Joi.string()
    .valid(...Object.values(ORDER_TYPE))
    .default(ORDER_TYPE.DINE_IN),

  // Required only when orderType is DELIVERY
  deliveryAddress: Joi.when('orderType', {
    is:        ORDER_TYPE.DELIVERY,
    then:      Joi.string().trim().min(5).max(500).required(),
    otherwise: Joi.string().trim().max(500).allow('', null).default(null),
  }),

  paymentMethod: Joi.string()
    .valid(...Object.values(PAYMENT_METHOD))
    .default(PAYMENT_METHOD.CASH),

  discount: Joi.number().min(0).max(100).precision(2).default(0), // percentage 0–100
  notes:    Joi.string().trim().max(500).allow('', null),
});

const updateStatus = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .required(),
});

const listQuery = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(10),
  status:    Joi.string().valid(...Object.values(ORDER_STATUS)),
  orderType: Joi.string().valid(...Object.values(ORDER_TYPE)),
  cashierId: Joi.string().uuid(),
  from:      Joi.date().iso(),
  to:        Joi.date().iso().min(Joi.ref('from')),
});

module.exports = { create, updateStatus, listQuery };