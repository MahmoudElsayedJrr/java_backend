const productRepo   = require('../repositories/product.repository');
const categoryRepo  = require('../repositories/category.repository');
const flavorRepo    = require('../repositories/flavor.repository');
const auditLogRepo  = require('../repositories/auditLog.repository');
const prisma        = require('../config/prisma');
const { uploadProductImage, deleteProductImage } = require('../utils/storage');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const { AUDIT_ACTIONS }   = require('../constants');
const { parsePagination } = require('../utils/helpers');
const { getIO }           = require('../sockets');

class ProductService {
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.active !== undefined)    where.active     = query.active === 'true';
    if (query.categoryId)              where.categoryId = query.categoryId;

    const { data, total } = await productRepo.findAllPaginated({ skip, take: limit, where });
    return { data, total, page, limit };
  }

  async getById(id) {
    const product = await productRepo.findByIdFull(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async getByCategory(categoryId) {
    const category = await categoryRepo.findById(categoryId);
    if (!category) throw new NotFoundError('Category not found');
    return productRepo.findActiveByCategory(categoryId);
  }

  async create(data, file, actorId) {
    // Validate category exists
    const category = await categoryRepo.findById(data.categoryId);
    if (!category || !category.active) throw new BadRequestError('Category not found or inactive');

    // Upload image if provided
    if (file) {
      data.imageUrl = await uploadProductImage(file.buffer, file.originalname);
    }

    // Extract flavorIds before creating product
    const { flavorIds, initialStock = 0, lowStock = 10, ...productData } = data;

    const product = await prisma.$transaction(async (tx) => {
      // 1. Create product
      const created = await tx.product.create({ data: productData });

      // 2. Attach flavors
      if (flavorIds?.length) {
        await _validateFlavors(flavorIds);
        await tx.productFlavor.createMany({
          data: flavorIds.map((flavorId) => ({ productId: created.id, flavorId })),
        });
      }

      return created;
    });

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.PRODUCT_CREATED,
      entity:   'Product',
      entityId: product.id,
      metadata: { name: product.name, categoryId: product.categoryId },
    });

    getIO()?.emit('catalog_updated');
    return productRepo.findByIdFull(product.id);
  }

  async update(id, data, file, actorId) {
    const existing = await productRepo.findByIdFull(id);
    if (!existing) throw new NotFoundError('Product not found');

    if (data.categoryId) {
      const cat = await categoryRepo.findById(data.categoryId);
      if (!cat || !cat.active) throw new BadRequestError('Category not found or inactive');
    }

    if (file) {
      if (existing.imageUrl) await deleteProductImage(existing.imageUrl);
      data.imageUrl = await uploadProductImage(file.buffer, file.originalname);
    }

    const { flavorIds, ...productData } = data;

    await prisma.$transaction(async (tx) => {
      // Update product fields
      await tx.product.update({ where: { id }, data: productData });

      // Replace flavors if provided
      if (flavorIds !== undefined) {
        await _validateFlavors(flavorIds);
        await tx.productFlavor.deleteMany({ where: { productId: id } });
        if (flavorIds.length) {
          await tx.productFlavor.createMany({
            data: flavorIds.map((flavorId) => ({ productId: id, flavorId })),
          });
        }
      }
    });

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.PRODUCT_UPDATED,
      entity:   'Product',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    getIO()?.emit('catalog_updated');
    return productRepo.findByIdFull(id);
  }

  async delete(id, actorId) {
    const existing = await productRepo.findById(id);
    if (!existing) throw new NotFoundError('Product not found');

    if (existing.imageUrl) await deleteProductImage(existing.imageUrl);
    await productRepo.delete(id);

    await auditLogRepo.log({
      userId:   actorId,
      action:   AUDIT_ACTIONS.PRODUCT_DELETED,
      entity:   'Product',
      entityId: id,
      metadata: { name: existing.name },
    });

    getIO()?.emit('catalog_updated');
  }
}

// ── Private ──────────────────────────────────────────────────

async function _validateFlavors(flavorIds) {
  const flavors = await flavorRepo.findMany({ where: { id: { in: flavorIds }, active: true } });
  if (flavors.length !== flavorIds.length) {
    throw new BadRequestError('One or more flavor IDs are invalid or inactive');
  }
}

module.exports = new ProductService();
