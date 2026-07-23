const flavorService = require("../services/flavor.service");

const orderService = require("../services/order.service");

const reportService = require("../services/report.service");

const stockService = require('../services/stockItem.service');

const { sendSuccess, paginate } = require("../utils/response");

const { HTTP_STATUS } = require("../constants");

// ── Flavor ───────────────────────────────────────────────────
class FlavorController {
  async getAll(req, res, next) {
    try {
      const { data, total, page, limit } = await flavorService.getAll(
        req.query,
      );
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) {
      next(err);
    }
  }
  async getAllActive(req, res, next) {
    try {
      sendSuccess(res, { data: await flavorService.getAllActive() });
    } catch (err) {
      next(err);
    }
  }
  async getById(req, res, next) {
    try {
      sendSuccess(res, { data: await flavorService.getById(req.params.id) });
    } catch (err) {
      next(err);
    }
  }
  async create(req, res, next) {
    try {
      const flavor = await flavorService.create(req.body, req.user.id);
      sendSuccess(res, {
        data: flavor,
        message: "Flavor created",
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (err) {
      next(err);
    }
  }
  async update(req, res, next) {
    try {
      const flavor = await flavorService.update(
        req.params.id,
        req.body,
        req.user.id,
      );
      sendSuccess(res, { data: flavor, message: "Flavor updated" });
    } catch (err) {
      next(err);
    }
  }
  async delete(req, res, next) {
    try {
      await flavorService.delete(req.params.id, req.user.id);
      sendSuccess(res, { message: "Flavor deleted" });
    } catch (err) {
      next(err);
    }
  }
}

class StockController {
  async getAll(req, res, next) {
    try {
      const { data, total, page, limit } = await stockService.getAll(req.query);
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) { next(err); }
  }
 
  async getById(req, res, next) {
    try {
      sendSuccess(res, { data: await stockService.getById(req.params.id) });
    } catch (err) { next(err); }
  }
 
  async getLowStock(req, res, next) {
    try {
      sendSuccess(res, { data: await stockService.getLowStock() });
    } catch (err) { next(err); }
  }
 
  async create(req, res, next) {
    try {
      const item = await stockService.create(req.body, req.user.id);
      sendSuccess(res, { data: item, message: 'Stock item created', statusCode: HTTP_STATUS.CREATED });
    } catch (err) { next(err); }
  }
 
  async update(req, res, next) {
    try {
      const item = await stockService.update(req.params.id, req.body, req.user.id);
      sendSuccess(res, { data: item, message: 'Stock item updated' });
    } catch (err) { next(err); }
  }
 
  async addQuantity(req, res, next) {
    try {
      const item = await stockService.addQuantity(req.params.id, req.body.amount, req.user.id);
      sendSuccess(res, { data: item, message: 'Stock added successfully' });
    } catch (err) { next(err); }
  }
 
  async deductQuantity(req, res, next) {
    try {
      const item = await stockService.deductQuantity(req.params.id, req.body.amount, req.user.id);
      sendSuccess(res, { data: item, message: 'Stock deducted successfully' });
    } catch (err) { next(err); }
  }
 
  async delete(req, res, next) {
    try {
      await stockService.delete(req.params.id, req.user.id);
      sendSuccess(res, { message: 'Stock item deleted' });
    } catch (err) { next(err); }
  }
}

// ── Inventory ────────────────────────────────────────────────
/* class InventoryController {
  async getAll(req, res, next) {
    try {
      const { data, total, page, limit } = await inventoryService.getAll(
        req.query,
      );
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) {
      next(err);
    }
  }
  async getByProduct(req, res, next) {
    try {
      sendSuccess(res, {
        data: await inventoryService.getByProduct(req.params.productId),
      });
    } catch (err) {
      next(err);
    }
  }
  async getLowStock(req, res, next) {
    try {
      sendSuccess(res, { data: await inventoryService.getLowStock() });
    } catch (err) {
      next(err);
    }
  }
  async update(req, res, next) {
    try {
      const inv = await inventoryService.update(
        req.params.productId,
        req.body,
        req.user.id,
      );
      sendSuccess(res, { data: inv, message: "Inventory updated" });
    } catch (err) {
      next(err);
    }
  }
  async addStock(req, res, next) {
    try {
      const inv = await inventoryService.addStock(
        req.params.productId,
        req.body.quantity,
        req.user.id,
      );
      sendSuccess(res, { data: inv, message: "Stock added" });
    } catch (err) {
      next(err);
    }
  }
} */

// ── Order ────────────────────────────────────────────────────
class OrderController {
  async getAll(req, res, next) {
    try {
      const { data, total, page, limit } = await orderService.getAll(req.query);
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) {
      next(err);
    }
  }
  async getDeliveryOrders(req, res, next) {
    try {
      const { data, total, page, limit } = await orderService.getDeliveryOrders(
        req.query,
      );
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) {
      next(err);
    }
  }
  async getDineInOrders(req, res, next) {
    try {
      const { data, total, page, limit } = await orderService.getDineInOrders(
        req.query,
      );
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) {
      next(err);
    }
  }
  async getById(req, res, next) {
    try {
      sendSuccess(res, { data: await orderService.getById(req.params.id) });
    } catch (err) {
      next(err);
    }
  }
  async getMyOrders(req, res, next) {
    try {
      const { data, total, page, limit } =
        await orderService.getMyCashierOrders(req.user.id, req.query);
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) {
      next(err);
    }
  }
  async getMyCustomerOrders(req, res, next) {
    try {
      const { data, total, page, limit } =
        await orderService.getMyCustomerOrders(req.user.id, req.query);
      sendSuccess(res, { data, meta: paginate({ page, limit, total }) });
    } catch (err) {
      next(err);
    }
  }
  async getCustomerOrderById(req, res, next) {
    try {
      const order = await orderService.getCustomerOrderById(
        req.params.id,
        req.user.id,
      );
      sendSuccess(res, { data: order });
    } catch (err) {
      next(err);
    }
  }
  async create(req, res, next) {
    try {
      const order = await orderService.create(
        req.body,
        req.user.id,
        req.user.role,
      );
      sendSuccess(res, {
        data: order,
        message: "Order created",
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (err) {
      next(err);
    }
  }
  async confirmPayment(req, res, next) {
    try {
      const order = await orderService.confirmPayment(
        req.params.id,
        req.user.id,
      );
      sendSuccess(res, { data: order, message: "Payment confirmed" });
    } catch (err) {
      next(err);
    }
  }
  async updateStatus(req, res, next) {
    try {
      const order = await orderService.updateStatus(
        req.params.id,
        req.body.status,
        req.user.id,
      );
      sendSuccess(res, { data: order, message: "Order status updated" });
    } catch (err) {
      next(err);
    }
  }
}

// ── Report ───────────────────────────────────────────────────
class ReportController {
  async daily(req, res, next) {
    try {
      sendSuccess(res, { data: await reportService.daily(req.query.date) });
    } catch (err) {
      next(err);
    }
  }
  async weekly(req, res, next) {
    try {
      sendSuccess(res, {
        data: await reportService.weekly(req.query.startDate),
      });
    } catch (err) {
      next(err);
    }
  }
  async monthly(req, res, next) {
    try {
      sendSuccess(res, {
        data: await reportService.monthly(req.query.year, req.query.month),
      });
    } catch (err) {
      next(err);
    }
  }
  async custom(req, res, next) {
    try {
      sendSuccess(res, {
        data: await reportService.custom(req.query.from, req.query.to),
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  flavorController: new FlavorController(),
  orderController: new OrderController(),
  reportController: new ReportController(),
  stockController: new StockController(),
};
