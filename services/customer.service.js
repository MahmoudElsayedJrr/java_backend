const customerRepo = require("../repositories/customer.repository");
const { NotFoundError, BadRequestError } = require("../utils/errors");
const { parsePagination } = require("../utils/helpers");

class CustomerService {
  async getAll(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const search = query.search || "";
    const { data, total } = await customerRepo.findWithStats({ skip, take: limit, search });
    return { data, total, page, limit };
  }

  async getById(id) {
    const customer = await customerRepo.findByIdWithOrders(id);
    if (!customer) throw new NotFoundError("Customer not found");
    return customer;
  }

  async create(data) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestError("Customer name is required");

    return customerRepo.create({
      name,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
    });
  }

  async update(id, data) {
    const customer = await customerRepo.findById(id);
    if (!customer) throw new NotFoundError("Customer not found");

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    return customerRepo.update(id, updateData);
  }

  async delete(id) {
    const customer = await customerRepo.findById(id);
    if (!customer) throw new NotFoundError("Customer not found");

    return customerRepo.delete(id);
  }
}

module.exports = new CustomerService();
