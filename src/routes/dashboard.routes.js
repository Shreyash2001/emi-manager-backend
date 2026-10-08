'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { requireStoreScope } = require('../middleware/requireStoreScope');
const dashboardController = require('../controllers/dashboard.controller');

router.use(authenticate, requireRole('STORE_OWNER', 'SUPER_ADMIN'), requireStoreScope);

router.get('/', dashboardController.getDashboard);

module.exports = router;