const router = require('express').Router();
const ctrl   = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, validateQuery } = require('../middlewares/validate');
const upload = require('../config/multer');
const v      = require('../validators/product.validator');

router.use(authenticate);

// Available to all authenticated users
router.get('/',                          validateQuery(v.listQuery), ctrl.getAll);
router.get('/category/:categoryId',      ctrl.getByCategory);
router.get('/:id',                       ctrl.getById);

// Admin only
router.post('/',     authorize('ADMIN'), upload.single('image'), validate(v.create), ctrl.create);
router.patch('/:id', authorize('ADMIN'), upload.single('image'), validate(v.update), ctrl.update);
router.delete('/:id',authorize('ADMIN'), ctrl.delete);

module.exports = router;
