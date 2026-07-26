const productService = require('../services/product.service');
const { sendSuccess, paginate } = require('../utils/response');
const { HTTP_STATUS } = require('../constants');

class ProductController {
  async getAll(req, res, next) {
    try {
      const { data, total, page, limit } = await productService.getAll(req.query, req.user.id);
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getById(req.params.id, req.user.id);
      sendSuccess(res, { data: product });
    } catch (err) { next(err); }
  }

  async getByCategory(req, res, next) {
    try {
      const data = await productService.getByCategory(req.params.categoryId, req.user.id);
      sendSuccess(res, { data });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const product = await productService.create(req.body, req.file, req.user.id);
      sendSuccess(res, { data: product, message: 'Product created', statusCode: HTTP_STATUS.CREATED });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const product = await productService.update(req.params.id, req.body, req.file, req.user.id);
      sendSuccess(res, { data: product, message: 'Product updated' });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await productService.delete(req.params.id, req.user.id);
      sendSuccess(res, { message: 'Product deleted' });
    } catch (err) { next(err); }
  }

  async toggleFavorite(req, res, next) {
    try {
      const result = await productService.toggleFavorite(req.params.id, req.user.id);
      sendSuccess(res, { data: result, message: result.isLiked ? 'Added to favorites' : 'Removed from favorites' });
    } catch (err) { next(err); }
  }
}

module.exports = new ProductController();
