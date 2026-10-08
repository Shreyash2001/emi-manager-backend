'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { requireStoreScope } = require('../middleware/requireStoreScope');
const reportController = require('../controllers/report.controller');

router.use(authenticate, requireRole('STORE_OWNER', 'SUPER_ADMIN'), requireStoreScope);

router.get('/summary', reportController.getSummary);
router.get('/monthly-trend', reportController.getMonthlyTrend);
router.get('/weekly-collection', reportController.getWeeklyCollection);
router.get('/smartphones', reportController.getSmartphones);

module.exports = router;