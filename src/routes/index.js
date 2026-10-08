'use strict';

const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/emi-plans', require('./emiPlan.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/reports', require('./report.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;