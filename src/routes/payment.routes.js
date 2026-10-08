'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { requireStoreScope } = require('../middleware/requireStoreScope');
const validate = require('../middleware/validate');
const {
    recordPaymentValidator,
    listPaymentsValidator,
} = require('../validators/payment.validator');
const paymentController = require('../controllers/payment.controller');

router.use(authenticate, requireRole('STORE_OWNER', 'SUPER_ADMIN'), requireStoreScope);

router
    .route('/')
    .get(validate(listPaymentsValidator), paymentController.listPayments)
    .post(validate(recordPaymentValidator), paymentController.recordPayment);

router.get('/:id', paymentController.getPayment);

module.exports = router;