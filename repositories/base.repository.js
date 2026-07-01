const prisma = require('../config/prisma');

class BaseRepository {
  constructor(modelName) {
    this.model  = prisma[modelName];
    this.prisma = prisma;
  }

  async findById(id, options = {}) {
    return this.model.findUnique({ where: { id }, ...options });
  }

  async findOne(where, options = {}) {
    return this.model.findFirst({ where, ...options });
  }

  async findMany(options = {}) {
    return this.model.findMany(options);
  }

  async count(where = {}) {
    return this.model.count({ where });
  }

  async create(data, options = {}) {
    return this.model.create({ data, ...options });
  }

  async update(id, data, options = {}) {
    return this.model.update({ where: { id }, data, ...options });
  }

  async delete(id) {
    return this.model.delete({ where: { id } });
  }

  async findWithPagination({ where = {}, select, include, orderBy, skip = 0, take = 10 }) {
    const [data, total] = await this.prisma.$transaction([
      this.model.findMany({ where, select, include, orderBy, skip, take }),
      this.model.count({ where }),
    ]);
    return { data, total };
  }
}

module.exports = BaseRepository;