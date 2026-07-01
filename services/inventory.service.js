const inventoryRepo = require('../repositories/inventory.repository');
const productRepo   = require('../repositories/product.repository');
const auditLogRepo  = require('../repositories/auditLog.repository');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { AUDIT_ACTIONS }   = require('../constants');
const { parsePagination } = require('../utils/helpers');

class InventoryService {
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const { data, total } = await inventoryRepo.findAllPaginated({ skip, take: limit });
    return { data, total, page, limit };
  }

  async getByProduct(productId) {
    const inventory = await inventoryRepo.findByProduct(productId);
    if (!inventory) throw new NotFoundError('Inventory record not found');
    return inventory;
  }

  async getLowStock() {
    return inventoryRepo.findLowStock();
  }

  async update(productId, data, actorId) {
    const product = await productRepo.findById(productId);
    if (!product) throw new NotFoundError('Product not found');

    if (data.quantity < 0) throw new BadRequestError('Quantity cannot be negative');

    const inventory = await inventoryRepo.upsertByProduct(
      productId,
      data.quantity,
      data.lowStock
    );

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.INVENTORY_UPDATED,
      entity:   'Inventory',
      entityId: inventory.id,
      metadata: { productId, quantity: data.quantity, lowStock: data.lowStock },
    });

    return inventory;
  }

  async addStock(productId, quantity, actorId) {
    const product = await productRepo.findById(productId);
    if (!product) throw new NotFoundError('Product not found');
    if (quantity <= 0) throw new BadRequestError('Quantity must be positive');

    const existing = await inventoryRepo.findByProduct(productId);
    const newQty   = (existing?.quantity || 0) + quantity;

    const inventory = await inventoryRepo.upsertByProduct(
      productId,
      newQty,
      existing?.lowStock || 10
    );

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.INVENTORY_UPDATED,
      entity:   'Inventory',
      entityId: inventory.id,
      metadata: { productId, added: quantity, newTotal: newQty },
    });

    return inventory;
  }
}

module.exports = new InventoryService();
