const paymentNumberRepo = require('../repositories/paymentnumber.repository');
const auditLogRepo      = require('../repositories/auditLog.repository');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { parsePagination } = require('../utils/helpers');
const prisma = require('../config/prisma');

class PaymentNumberService {
 
  async getDefaults() {
    const [instapay, vodafone] = await Promise.all([
      paymentNumberRepo.findDefault('INSTAPAY'),
      paymentNumberRepo.findDefault('VODAFONE_CASH'),
    ]);

    return {
      instapay:     instapay  || null,
      vodafone_cash: vodafone || null,
    };
  }

  async getByType(type) {
    return paymentNumberRepo.findAllByType(type);
  }

  
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.type) where.type = query.type;
    const { data, total } = await paymentNumberRepo.findAllPaginated({ skip, take: limit, where });
    return { data, total, page, limit };
  }

  async getById(id) {
    const item = await paymentNumberRepo.findById(id);
    if (!item) throw new NotFoundError('Payment number not found');
    return item;
  }

  async create(data, actorId) {
    const item = await paymentNumberRepo.create({
      type:      data.type,
      number:    data.number,
      name:      data.name,
      isDefault: data.isDefault || false,
      active:    true,
    });

    // لو isDefault = true → شيل الـ default من الباقيين
    if (data.isDefault) {
      await prisma.$transaction([
        prisma.paymentNumber.updateMany({
          where: { type: data.type, id: { not: item.id } },
          data:  { isDefault: false },
        }),
      ]);
    }

    await auditLogRepo.log({
      userId:   actorId,
      action:   'PAYMENT_NUMBER_CREATED',
      entity:   'PaymentNumber',
      entityId: item.id,
      metadata: { type: item.type, number: item.number },
    });

    return item;
  }

  async update(id, data, actorId) {
    const existing = await paymentNumberRepo.findById(id);
    if (!existing) throw new NotFoundError('Payment number not found');

   
    if (data.isDefault === true) {
      await paymentNumberRepo.clearDefault(existing.type);
    }

    const updated = await paymentNumberRepo.update(id, data);

    await auditLogRepo.log({
      userId:   actorId,
      action:   'PAYMENT_NUMBER_UPDATED',
      entity:   'PaymentNumber',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }

  async setDefault(id, actorId) {
    const existing = await paymentNumberRepo.findById(id);
    if (!existing) throw new NotFoundError('Payment number not found');
    if (!existing.active) throw new BadRequestError('Cannot set inactive number as default');

   
    await paymentNumberRepo.clearDefault(existing.type);


    const updated = await paymentNumberRepo.update(id, { isDefault: true });

    await auditLogRepo.log({
      userId:   actorId,
      action:   'PAYMENT_NUMBER_SET_DEFAULT',
      entity:   'PaymentNumber',
      entityId: id,
      metadata: { type: existing.type, number: existing.number },
    });

    return updated;
  }

  async delete(id, actorId) {
    const existing = await paymentNumberRepo.findById(id);
    if (!existing) throw new NotFoundError('Payment number not found');

    if (existing.isDefault) {
      throw new BadRequestError('Cannot delete the default payment number. Set another number as default first.');
    }

    await paymentNumberRepo.delete(id);

    await auditLogRepo.log({
      userId:   actorId,
      action:   'PAYMENT_NUMBER_DELETED',
      entity:   'PaymentNumber',
      entityId: id,
      metadata: { type: existing.type, number: existing.number },
    });
  }
}

module.exports = new PaymentNumberService();