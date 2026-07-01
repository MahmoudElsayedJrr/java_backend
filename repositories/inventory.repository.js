const BaseRepository = require('./base.repository');

class InventoryRepository extends BaseRepository {
  constructor() { super('inventory'); }

  findByProduct(productId) {
    return this.model.findUnique({
      where:   { productId },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  findLowStock() {
    // Returns all products where quantity <= lowStock threshold
    return this.prisma.$queryRaw`
      SELECT i.*, p.name as "productName"
      FROM inventory i
      JOIN products p ON p.id = i."productId"
      WHERE i.quantity <= i."lowStock"
      ORDER BY i.quantity ASC
    `;
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      include: { product: { select: { id: true, name: true, category: { select: { name: true } } } } },
      orderBy: { quantity: 'asc' },
      skip,
      take,
    });
  }

  /**
   * Atomically deduct quantity — used inside order creation transaction
   * Throws if quantity would go negative
   */
  async deductStock(productId, quantity, tx) {
    const client = tx || this.prisma;

    const inventory = await client.inventory.findUnique({ where: { productId } });
    if (!inventory || inventory.quantity < quantity) {
      throw new Error(`Insufficient stock for product ${productId}`);
    }

    return client.inventory.update({
      where: { productId },
      data:  { quantity: { decrement: quantity } },
    });
  }

  upsertByProduct(productId, quantity, lowStock = 10) {
    return this.model.upsert({
      where:  { productId },
      create: { productId, quantity, lowStock },
      update: { quantity, lowStock },
    });
  }
}

module.exports = new InventoryRepository();