const BaseRepository = require('./base.repository');

class AuditLogRepository extends BaseRepository {
  constructor() { super('auditLog'); }

  /**
   * Create an audit log entry
   * Called from services after every important action
   */
  log({ userId, action, entity = null, entityId = null, metadata = null }) {
    return this.model.create({
      data: { userId, action, entity, entityId, metadata },
    });
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  findByUser(userId, { skip, take }) {
    return this.findWithPagination({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  findByEntity(entity, entityId) {
    return this.model.findMany({
      where:   { entity, entityId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

module.exports = new AuditLogRepository();