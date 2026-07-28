const BaseRepository = require('./base.repository');

class PaymentNumberRepository extends BaseRepository {
  constructor() { super('paymentNumber'); }

  findAllByType(type) {
    return this.model.findMany({
      where:   { type, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findDefault(type) {
    return this.model.findFirst({
      where: { type, isDefault: true, active: true },
    });
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }],
      skip,
      take,
    });
  }


  clearDefault(type) {
    return this.model.updateMany({
      where: { type },
      data:  { isDefault: false },
    });
  }
}

module.exports = new PaymentNumberRepository();