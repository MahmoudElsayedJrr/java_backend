const stockRepo = require("../repositories/stockItem.repository");
const auditLogRepo = require("../repositories/auditLog.repository");
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require("../utils/errors");
const { parsePagination } = require("../utils/helpers");

class StockItemService {
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const { data, total } = await stockRepo.findAllPaginated({
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getById(id) {
    const item = await stockRepo.findById(id);
    if (!item) throw new NotFoundError("Stock item not found");
    return item;
  }

  async getLowStock() {
    return stockRepo.findLowStockRaw();
  }

  async create(data, actorId) {
    const existing = await stockRepo.findByName(data.name);
    if (existing)
      throw new ConflictError("Stock item with this name already exists");

    const item = await stockRepo.create({
      name: data.name,
      unit: data.unit || "piece",
      quantity: data.quantity || 0,
      lowStock: data.lowStock || 10,
      notes: data.notes || null,
    });

    await auditLogRepo.log({
      userId: actorId,
      action: "STOCK_ITEM_CREATED",
      entity: "StockItem",
      entityId: item.id,
      metadata: { name: item.name, quantity: item.quantity, unit: item.unit },
    });

    return item;
  }

  async update(id, data, actorId) {
    const existing = await stockRepo.findById(id);
    if (!existing) throw new NotFoundError("Stock item not found");

    if (data.name && data.name !== existing.name) {
      const taken = await stockRepo.findByName(data.name);
      if (taken)
        throw new ConflictError("Stock item with this name already exists");
    }

    const updated = await stockRepo.update(id, data);

    await auditLogRepo.log({
      userId: actorId,
      action: "STOCK_ITEM_UPDATED",
      entity: "StockItem",
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }

  async addQuantity(id, amount, actorId) {
    const existing = await stockRepo.findById(id);
    if (!existing) throw new NotFoundError("Stock item not found");
    if (amount <= 0) throw new BadRequestError("Amount must be positive");

    const updated = await stockRepo.addQuantity(id, amount);

    await auditLogRepo.log({
      userId: actorId,
      action: "STOCK_ADDED",
      entity: "StockItem",
      entityId: id,
      metadata: {
        added: amount,
        newQuantity: updated.quantity,
        unit: updated.unit,
      },
    });

    return updated;
  }

  async deductQuantity(id, amount, actorId) {
    const existing = await stockRepo.findById(id);
    if (!existing) throw new NotFoundError("Stock item not found");
    if (amount <= 0) throw new BadRequestError("Amount must be positive");
    if (parseFloat(existing.quantity) < amount) {
      throw new BadRequestError(
        `Insufficient stock. Available: ${existing.quantity} ${existing.unit}`,
      );
    }

    const updated = await stockRepo.deductQuantity(id, amount);

    await auditLogRepo.log({
      userId: actorId,
      action: "STOCK_DEDUCTED",
      entity: "StockItem",
      entityId: id,
      metadata: {
        deducted: amount,
        newQuantity: updated.quantity,
        unit: updated.unit,
      },
    });

    return updated;
  }

  async delete(id, actorId) {
    const existing = await stockRepo.findById(id);
    if (!existing) throw new NotFoundError("Stock item not found");

    await stockRepo.delete(id);

    await auditLogRepo.log({
      userId: actorId,
      action: "STOCK_ITEM_DELETED",
      entity: "StockItem",
      entityId: id,
      metadata: { name: existing.name },
    });
  }
}

module.exports = new StockItemService();
