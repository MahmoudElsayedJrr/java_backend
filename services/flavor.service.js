const flavorRepo   = require('../repositories/flavor.repository');
const auditLogRepo = require('../repositories/auditLog.repository');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { AUDIT_ACTIONS }   = require('../constants');
const { parsePagination } = require('../utils/helpers');

class FlavorService {
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.active !== undefined) where.active = query.active === 'true';

    const { data, total } = await flavorRepo.findAllPaginated({ skip, take: limit, where });
    return { data, total, page, limit };
  }

  async getAllActive() {
    return flavorRepo.findAllActive();
  }

  async getById(id) {
    const flavor = await flavorRepo.findById(id);
    if (!flavor) throw new NotFoundError('Flavor not found');
    return flavor;
  }

  async create(data, actorId) {
    const existing = await flavorRepo.findByName(data.name);
    if (existing) throw new ConflictError('Flavor name already exists');

    const flavor = await flavorRepo.create(data);

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.FLAVOR_CREATED,
      entity:   'Flavor',
      entityId: flavor.id,
      metadata: { name: flavor.name },
    });

    return flavor;
  }

  async update(id, data, actorId) {
    const existing = await flavorRepo.findById(id);
    if (!existing) throw new NotFoundError('Flavor not found');

    if (data.name && data.name !== existing.name) {
      const taken = await flavorRepo.findByName(data.name);
      if (taken) throw new ConflictError('Flavor name already exists');
    }

    const updated = await flavorRepo.update(id, data);

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.FLAVOR_UPDATED,
      entity:   'Flavor',
      entityId: id,
    });

    return updated;
  }

  async delete(id, actorId) {
    const existing = await flavorRepo.findById(id);
    if (!existing) throw new NotFoundError('Flavor not found');

    await flavorRepo.delete(id);

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.FLAVOR_DELETED,
      entity:   'Flavor',
      entityId: id,
      metadata: { name: existing.name },
    });
  }
}

module.exports = new FlavorService();
