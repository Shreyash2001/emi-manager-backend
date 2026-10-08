'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { requireStoreScope } = require('../middleware/requireStoreScope');
const validate = require('../middleware/validate');
const {
    createCustomerValidator,
    updateCustomerValidator,
    listCustomersValidator,
} = require('../validators/customer.validator');
const customerController = require('../controllers/customer.controller');

router.use(authenticate, requireRole('STORE_OWNER', 'SUPER_ADMIN'), requireStoreScope);

router
    .route('/')
    .get(validate(listCustomersValidator), customerController.listCustomers)
    .post(validate(createCustomerValidator), customerController.createCustomer);

router
    .route('/:id')
    .get(customerController.getCustomer)
    .put(validate(updateCustomerValidator), customerController.updateCustomer);

module.exports = router;