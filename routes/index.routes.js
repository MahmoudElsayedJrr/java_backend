const express = require('express');
const {
  flavorController:    fc,
  inventoryController: ic,
  orderController:     oc,
  reportController:    rc,
} = require('../controllers/index');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, validateQuery } = require('../middlewares/validate');
const v  = require('../validators/flavor.validator');
const iv = require('../validators/inventory-shift.validator');
const ov = require('../validators/order.validator');

// ── Flavors ──────────────────────────────────────────────────
const flavorRouter = express.Router();
flavorRouter.use(authenticate);
flavorRouter.get('/active',  fc.getAllActive);
flavorRouter.get('/',        validateQuery(v.listQuery), fc.getAll);
flavorRouter.get('/:id',     fc.getById);
flavorRouter.post('/',       authorize('ADMIN'), validate(v.create), fc.create);
flavorRouter.patch('/:id',   authorize('ADMIN'), validate(v.update), fc.update);
flavorRouter.delete('/:id',  authorize('ADMIN'), fc.delete);

// ── Inventory ─────────────────────────────────────────────────
const inventoryRouter = express.Router();
inventoryRouter.use(authenticate, authorize('ADMIN'));
inventoryRouter.get('/',                        ic.getAll);
inventoryRouter.get('/low-stock',               ic.getLowStock);
inventoryRouter.get('/product/:productId',      ic.getByProduct);
inventoryRouter.put('/product/:productId',      validate(iv.updateInventory), ic.update);
inventoryRouter.post('/product/:productId/add', validate(iv.addStock),        ic.addStock);

// ── Orders ────────────────────────────────────────────────────
const orderRouter = express.Router();
orderRouter.use(authenticate);
orderRouter.post('/',            authorize('ADMIN', 'CASHIER'), validate(ov.create),        oc.create);
orderRouter.get('/my',           authorize('ADMIN', 'CASHIER'), validateQuery(ov.listQuery), oc.getMyOrders);
orderRouter.get('/',             authorize('ADMIN'),            validateQuery(ov.listQuery), oc.getAll);
orderRouter.get('/:id',          authorize('ADMIN', 'CASHIER'), oc.getById);
orderRouter.patch('/:id/status', authorize('ADMIN', 'CASHIER'), validate(ov.updateStatus),  oc.updateStatus);

// ── Reports ───────────────────────────────────────────────────
const reportRouter = express.Router();
reportRouter.use(authenticate, authorize('ADMIN'));
reportRouter.get('/daily',   rc.daily);
reportRouter.get('/weekly',  rc.weekly);
reportRouter.get('/monthly', rc.monthly);

module.exports = { flavorRouter, inventoryRouter, orderRouter, reportRouter };