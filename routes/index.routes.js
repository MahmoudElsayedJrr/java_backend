
const express = require("express");

const {
  flavorController: fc,
  orderController: oc,
  reportController: rc,
  stockController: stc,
  paymentNumberController: pnc ,
} = require("../controllers/index");


const { authenticate, authorize } = require("../middlewares/auth");
const { validate, validateQuery } = require("../middlewares/validate");

const sv = require("../validators/stockItem.validator");
const v = require("../validators/flavor.validator");
const iv = require("../validators/inventory-shift.validator");
const ov = require("../validators/order.validator");
const pv  = require('../validators/paymentnumber.validator');

// ── Flavors ──────────────────────────────────────────────────
const flavorRouter = express.Router();
flavorRouter.use(authenticate);
flavorRouter.get("/active", fc.getAllActive);
flavorRouter.get("/", validateQuery(v.listQuery), fc.getAll);
flavorRouter.get("/:id", fc.getById);
flavorRouter.post("/", authorize("ADMIN"), validate(v.create), fc.create);
flavorRouter.patch("/:id", authorize("ADMIN"), validate(v.update), fc.update);
flavorRouter.delete("/:id", authorize("ADMIN"), fc.delete);

// ── Stock ────────────────────────────────────────────────────
const stockRouter = express.Router();
stockRouter.use(authenticate, authorize("ADMIN"));
stockRouter.get("/", validateQuery(sv.listQuery), stc.getAll);
stockRouter.get("/low-stock", stc.getLowStock);
stockRouter.get("/:id", stc.getById);
stockRouter.post("/", validate(sv.create), stc.create);
stockRouter.patch("/:id", validate(sv.update), stc.update);
stockRouter.post("/:id/add", validate(sv.adjustQuantity), stc.addQuantity);
stockRouter.post(
  "/:id/deduct",
  validate(sv.adjustQuantity),
  stc.deductQuantity,
);
stockRouter.delete("/:id", stc.delete);

// ── Inventory ─────────────────────────────────────────────────
/* const inventoryRouter = express.Router();
inventoryRouter.use(authenticate, authorize("ADMIN"));
inventoryRouter.get("/", ic.getAll);
inventoryRouter.get("/low-stock", ic.getLowStock);
inventoryRouter.get("/product/:productId", ic.getByProduct);
inventoryRouter.put(
  "/product/:productId",
  validate(iv.updateInventory),
  ic.update,
);
inventoryRouter.post(
  "/product/:productId/add",
  validate(iv.addStock),
  ic.addStock,
); */

// ── Orders ────────────────────────────────────────────────────
const orderRouter = express.Router();
orderRouter.use(authenticate);

// Customer
orderRouter.get(
  "/my-orders",
  authorize("CUSTOMER"),
  validateQuery(ov.listQuery),
  oc.getMyCustomerOrders,
);
orderRouter.get(
  "/my-orders/:id",
  authorize("CUSTOMER"),
  oc.getCustomerOrderById,
);
orderRouter.post(
  "/",
  authorize("ADMIN", "CASHIER", "CUSTOMER"),
  validate(ov.create),
  oc.create,
);

// Cashier
orderRouter.get(
  "/my",
  authorize("ADMIN", "CASHIER"),
  validateQuery(ov.listQuery),
  oc.getMyOrders,
);

// Admin + Cashier — confirm payment
orderRouter.patch(
  "/:id/confirm-payment",
  authorize("ADMIN", "CASHIER"),
  oc.confirmPayment,
);

// Admin + Cashier + Customer — update status
orderRouter.patch(
  "/:id/status",
  authorize("ADMIN", "CASHIER", "CUSTOMER"),
  validate(ov.updateStatus),
  oc.updateStatus,
);

// Admin only
orderRouter.get(
  "/delivery",
  authorize("ADMIN", "CASHIER"),
  validateQuery(ov.listQuery),
  oc.getDeliveryOrders,
);
orderRouter.get(
  "/dine-in",
  authorize("ADMIN"),
  validateQuery(ov.listQuery),
  oc.getDineInOrders,
);
orderRouter.get(
  "/",
  authorize("ADMIN", "CASHIER"),
  validateQuery(ov.listQuery),
  oc.getAll,
);
orderRouter.get("/:id", authorize("ADMIN", "CASHIER"), oc.getById);

// ── Payment Numbers ────────────────────────────────────────────
const paymentNumberRouter = express.Router();
paymentNumberRouter.get('/defaults',        authenticate, pnc.getDefaults);
paymentNumberRouter.get('/type/:type',      authenticate, pnc.getByType);
 
paymentNumberRouter.get('/',                authenticate, authorize('ADMIN'), validateQuery(pv.listQuery), pnc.getAll);
paymentNumberRouter.get('/:id',             authenticate, authorize('ADMIN'), pnc.getById);
paymentNumberRouter.post('/',               authenticate, authorize('ADMIN'), validate(pv.create),         pnc.create);
paymentNumberRouter.patch('/:id',           authenticate, authorize('ADMIN'), validate(pv.update),         pnc.update);
paymentNumberRouter.patch('/:id/default',   authenticate, authorize('ADMIN'), pnc.setDefault);
paymentNumberRouter.delete('/:id',          authenticate, authorize('ADMIN'), pnc.delete);

// ── Reports ───────────────────────────────────────────────────
const reportRouter = express.Router();
reportRouter.use(authenticate, authorize("ADMIN"));
reportRouter.get("/daily", rc.daily);
reportRouter.get("/weekly", rc.weekly);
reportRouter.get("/monthly", rc.monthly);
reportRouter.get("/custom", rc.custom);

module.exports = { flavorRouter, orderRouter, paymentNumberRouter, reportRouter, stockRouter };
