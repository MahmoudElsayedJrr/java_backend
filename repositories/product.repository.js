const BaseRepository = require('./base.repository');

const PRODUCT_INCLUDE = {
  category:       { select: { id: true, name: true } },
  productFlavors: { include: { flavor: true } },
  inventory:      { select: { quantity: true, lowStock: true } },
};

class ProductRepository extends BaseRepository {
  constructor() { super('product'); }

  findByIdFull(id) {
    return this.model.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  findActiveByCategory(categoryId) {
    return this.model.findMany({
      where:   { categoryId, active: true },
      include: PRODUCT_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  // Used during order creation — get price + flavors in one query
  findForOrder(id) {
    return this.model.findUnique({
      where:   { id, active: true },
      select: {
        id: true, name: true, basePrice: true, active: true,
        inventory:      { select: { quantity: true } },
        productFlavors: { select: { flavorId: true, flavor: { select: { additionalPrice: true } } } },
      },
    });
  }
}

module.exports = new ProductRepository();