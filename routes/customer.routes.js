const express = require("express");
const customerController = require("../controllers/customer.controller");
const { authenticate, authorize } = require("../middlewares/auth");
const { validate, validateQuery } = require("../middlewares/validate");
const cv = require("../validators/customer.validator");

const router = express.Router();

router.use(authenticate);

// Cashiers & Admins can list customers to select them in POS
router.get("/", authorize("ADMIN", "CASHIER"), validateQuery(cv.listQuery), (req, res, next) => customerController.getAll(req, res, next));

// ONLY ADMIN can view full customer orders, add, edit, or delete customers
router.get("/:id", authorize("ADMIN"), (req, res, next) => customerController.getById(req, res, next));
router.post("/", authorize("ADMIN"), validate(cv.create), (req, res, next) => customerController.create(req, res, next));
router.patch("/:id", authorize("ADMIN"), validate(cv.update), (req, res, next) => customerController.update(req, res, next));
router.delete("/:id", authorize("ADMIN"), (req, res, next) => customerController.delete(req, res, next));

module.exports = router;
