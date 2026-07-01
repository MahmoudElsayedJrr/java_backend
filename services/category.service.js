const categoryRepo  = require('../repositories/category.repository');
const auditLogRepo  = require('../repositories/auditLog.repository');
const { uploadCategoryImage, deleteCategoryImage } = require('../utils/storage');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { AUDIT_ACTIONS }  = require('../constants');
const { parsePagination } = require('../utils/helpers');

class CategoryService {
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.active !== undefined) where.active = query.active === 'true';

    const { data, total } = await categoryRepo.findAllPaginated({ skip, take: limit, where });
    return { data, total, page, limit };
  }

  async getAllActive() {
    return categoryRepo.findAllActive();
  }

  async getById(id) {
    const category = await categoryRepo.findByIdWithStats(id);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  async create(data, file, actorId) {
    const existing = await categoryRepo.findByName(data.name);
    if (existing) throw new ConflictError('Category name already exists');

    // Upload image if provided
    if (file) {
      data.imageUrl = await uploadCategoryImage(file.buffer, file.originalname);
    }

    const category = await categoryRepo.create(data);

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.CATEGORY_CREATED,
      entity:   'Category',
      entityId: category.id,
      metadata: { name: category.name },
    });

    return category;
  }

  async update(id, data, file, actorId) {
    const existing = await categoryRepo.findById(id);
    if (!existing) throw new NotFoundError('Category not found');

    // Check name uniqueness (if changing)
    if (data.name && data.name !== existing.name) {
      const taken = await categoryRepo.findByName(data.name);
      if (taken) throw new ConflictError('Category name already exists');
    }

    // Handle image update
    if (file) {
      if (existing.imageUrl) await deleteCategoryImage(existing.imageUrl);
      data.imageUrl = await uploadCategoryImage(file.buffer, file.originalname);
    }

    const updated = await categoryRepo.update(id, data);

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.CATEGORY_UPDATED,
      entity:   'Category',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }

  async delete(id, actorId) {
    const existing = await categoryRepo.findByIdWithStats(id);
    if (!existing) throw new NotFoundError('Category not found');

    if (existing._count.products > 0) {
      throw new ConflictError('Cannot delete category with existing products. Deactivate it instead.');
    }

    if (existing.imageUrl) await deleteCategoryImage(existing.imageUrl);
    await categoryRepo.delete(id);

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.CATEGORY_DELETED,
      entity:   'Category',
      entityId: id,
      metadata: { name: existing.name },
    });
  }
}

module.exports = new CategoryService();
