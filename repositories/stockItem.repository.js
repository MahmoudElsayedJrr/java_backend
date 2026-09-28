const BaseRepository = require("./base.repository");


const STOCK_INCLUDE = {
  productRecipes: {
    include: { product: { select: { id: true, name: true } } },
  },
};

class StockItemRepository extends BaseRepository {
  constructor() {
    super("stockItem");
  }

  findByIdWithRecipes(id) {
    return this.model.findUnique({ where: { id }, include: STOCK_INCLUDE });
  }

  findByName(name) {
    return this.model.findUnique({ where: { name } });
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      include: STOCK_INCLUDE,
      orderBy: { name: "asc" },
      skip,
      take,
    });
  }
  _dummyOldFindAll({ skip, take, where = {} }) {
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
