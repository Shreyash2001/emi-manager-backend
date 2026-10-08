'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
    createStoreValidator,
    updateStoreValidator,
    updateStoreStatusValidator,
    resetPasswordValidator,
    updateThemeValidator,
    listStoresValidator,
} = require('../validators/admin.validator');
const adminController = require('../controllers/admin.controller');

// Every /admin route requires a SUPER_ADMIN.
router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/dashboard', adminController.getDashboard);

router
    .route('/stores')
    .get(validate(listStoresValidator), adminController.listStores)
    .post(validate(createStoreValidator), adminController.createStore);

router.put(
    '/stores/:id',
    validate(updateStoreValidator),
    adminController.updateStore
);

router.put(
    '/stores/:id/status',
    validate(updateStoreStatusValidator),
    adminController.updateStoreStatus
);

router.put(
    '/stores/:id/password',
    validate(resetPasswordValidator),
    adminController.resetPassword
);

router.put('/stores/:id/theme', validate(updateThemeValidator), adminController.updateTheme);

module.exports = router;