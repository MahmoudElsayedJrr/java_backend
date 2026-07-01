const BaseRepository = require('./base.repository');

class CategoryRepository extends BaseRepository {
  constructor() { super('category'); }

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

  findAllActive() {
    return this.model.findMany({
      where:   { active: true },
      orderBy: { name: 'asc' },
    });
  }

  // Include product count per category
  findByIdWithStats(id) {
    return this.model.findUnique({
      where:   { id },
      include: { _count: { select: { products: true } } },
    });
  }
}

module.exports = new CategoryRepository();