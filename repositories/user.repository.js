const BaseRepository = require('./base.repository');

// Fields safe to return to the client — never expose password
const SAFE_SELECT = {
  id: true, name: true, email: true,
  role: true, active: true, createdAt: true, updatedAt: true,
};

class UserRepository extends BaseRepository {
  constructor() { super('user'); }

  findByEmail(email) {
    return this.model.findUnique({ where: { email } });
  }

  findByIdSafe(id) {
    return this.model.findUnique({ where: { id }, select: SAFE_SELECT });
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      select:  SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  createUser(data) {
    return this.model.create({ data, select: SAFE_SELECT });
  }

  updateUser(id, data) {
    return this.model.update({ where: { id }, data, select: SAFE_SELECT });
  }
}

module.exports = new UserRepository();