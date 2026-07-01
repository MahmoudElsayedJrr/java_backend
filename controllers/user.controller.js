const userService     = require('../services/user.service');
const { sendSuccess } = require('../utils/response');
const { paginate }    = require('../utils/response');
const { HTTP_STATUS } = require('../constants');

class UserController {
  async getAll(req, res, next) {
    try {
      const { data, total, page, limit } = await userService.getAll(req.query);
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getById(req.params.id);
      sendSuccess(res, { data: user });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const user = await userService.create(req.body, req.user.id);
      sendSuccess(res, { data: user, message: 'User created', statusCode: HTTP_STATUS.CREATED });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body, req.user.id);
      sendSuccess(res, { data: user, message: 'User updated' });
    } catch (err) { next(err); }
  }

  async deactivate(req, res, next) {
    try {
      const user = await userService.deactivate(req.params.id, req.user.id);
      sendSuccess(res, { data: user, message: 'User deactivated' });
    } catch (err) { next(err); }
  }

  async activate(req, res, next) {
    try {
      const user = await userService.activate(req.params.id, req.user.id);
      sendSuccess(res, { data: user, message: 'User activated' });
    } catch (err) { next(err); }
  }
}

module.exports = new UserController();
