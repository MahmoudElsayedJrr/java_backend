const router = require("express").Router();
const ctrl = require("../controllers/user.controller");
const { authenticate, authorize } = require("../middlewares/auth");
const { validate, validateQuery } = require("../middlewares/validate");
const v = require("../validators/user.validator");

// All routes require ADMIN
router.use(authenticate, authorize("ADMIN"));

router.get("/", validateQuery(v.listQuery), ctrl.getAll);
router.get("/:id", ctrl.getById);
router.post("/", validate(v.create), ctrl.create);
router.patch("/:id", validate(v.update), ctrl.update);
router.delete("/:id", ctrl.delete);
router.patch("/:id/deactivate", ctrl.deactivate);
router.patch("/:id/activate", ctrl.activate);

module.exports = router;
