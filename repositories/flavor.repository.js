const BaseRepository = require('./base.repository');

class FlavorRepository extends BaseRepository {
  constructor() { super('flavor'); }

  findAllActive() {
    return this.model.findMany({
      where:   { active: true },
      orderBy: { name: 'asc' },
    });
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  }

  findByName(name) {
    return this.model.findUnique({ where: { name } });
  }

  // Get flavors attached to a specific product
  findByProduct(productId) {
    return this.prisma.productFlavor.findMany({
      where:   { productId },
      include: { flavor: true },
    });
  }

  // Validate that all flavorIds belong to a product
  validateFlavorsForProduct(productId, flavorIds) {
    return this.prisma.productFlavor.findMany({
      where: { productId, flavorId: { in: flavorIds } },
    });
  }
}

module.exports = new FlavorRepository();