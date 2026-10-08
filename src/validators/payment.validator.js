'use strict';

const { body, query } = require('express-validator');

const recordPaymentValidator = [
  body('customerId').isMongoId().withMessage('customerId must be a valid id'),
  body('emiPlanId').isMongoId().withMessage('emiPlanId must be a valid id'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['CASH', 'UPI', 'UPI_AUTOPAY', 'CARD'])
    .withMessage('paymentMethod must be one of CASH, UPI, UPI_AUTOPAY, CARD'),
  body('paymentType').optional().isIn(['EMI', 'DOWN_PAYMENT']),
  body('installmentNumber').optional().isInt({ min: 1 }),
  body('paymentDate').optional().isISO8601(),
  body('transactionReference').optional({ values: 'falsy' }).isString(),
  body('notes').optional({ values: 'falsy' }).isString(),
];

const listPaymentsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('emiPlanId').optional().isMongoId(),
  query('customerId').optional().isMongoId(),
];

module.exports = { recordPaymentValidator, listPaymentsValidator };