const Joi = require("joi");

// ── Inventory only ───────────────────────────────────────────

const updateInventory = Joi.object({
  quantity: Joi.number().integer().min(0).required(),
  lowStock: Joi.number().integer().min(0).default(10),
});

const addStock = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});

module.exports = { updateInventory, addStock };
