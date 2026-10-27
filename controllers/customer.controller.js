const customerService = require("../services/customer.service");
const { sendSuccess, paginate } = require("../utils/response");

class CustomerController {
  async getAll(req, res, next) {
    try {
      const { data, total, page, limit } = await customerService.getAll(req.query);
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const customer = await customerService.getById(req.params.id);
      sendSuccess(res, { data: customer });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const customer = await customerService.create(req.body);
      sendSuccess(res, { data: customer, message: "Customer created successfully" }, 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const customer = await customerService.update(req.params.id, req.body);
      sendSuccess(res, { data: customer, message: "Customer updated successfully" });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await customerService.delete(req.params.id);
      sendSuccess(res, { message: "Customer deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CustomerController();
