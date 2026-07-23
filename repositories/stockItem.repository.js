const BaseRepository = require("./base.repository");

class StockItemRepository extends BaseRepository {
  constructor() {
    super("stockItem");
  }

  findByName(name) {
    return this.model.findUnique({ where: { name } });
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    });
  }

  findLowStock() {
    return this.model.findMany({
      where: {
        quantity: { lte: this.prisma.stockItem.fields?.lowStock },
      },
      orderBy: { quantity: "asc" },
    });
  }

  findLowStockRaw() {
    return this.prisma.$queryRaw`
      SELECT * FROM stock_items
      WHERE quantity <= "lowStock"
      ORDER BY quantity ASC
    `;
  }

  addQuantity(id, amount) {
    return this.model.update({
      where: { id },
      data: { quantity: { increment: parseFloat(amount) } },
    });
  }

  deductQuantity(id, amount) {
    return this.model.update({
      where: { id },
      data: { quantity: { decrement: parseFloat(amount) } },
    });
  }
}

module.exports = new StockItemRepository();
