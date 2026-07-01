const categoryService = require('../services/category.service');
const { sendSuccess, paginate } = require('../utils/response');
const { HTTP_STATUS } = require('../constants');

class CategoryController {
  async getAll(req, res, next) {
    try {
      const { data, total, page, limit } = await categoryService.getAll(req.query);
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) { next(err); }
  }

  async getAllActive(req, res, next) {
    try {
      const data = await categoryService.getAllActive();
      sendSuccess(res, { data });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const category = await categoryService.getById(req.params.id);
      sendSuccess(res, { data: category });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const category = await categoryService.create(req.body, req.file, req.user.id);
      sendSuccess(res, { data: category, message: 'Category created', statusCode: HTTP_STATUS.CREATED });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const category = await categoryService.update(req.params.id, req.body, req.file, req.user.id);
      sendSuccess(res, { data: category, message: 'Category updated' });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await categoryService.delete(req.params.id, req.user.id);
      sendSuccess(res, { message: 'Category deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = new CategoryController();
