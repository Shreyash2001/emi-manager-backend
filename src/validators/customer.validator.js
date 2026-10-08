'use strict';

const { body, query } = require('express-validator');

const createCustomerValidator = [
  body('customer').exists().withMessage('customer object is required').isObject(),
  body('customer').custom((cust) => {
    const name = cust?.fullName || cust?.name;
    if (!name || !name.trim()) {
      throw new Error('Customer full name is required');
    }
    if (!cust?.mobileNumber || !cust?.mobileNumber.trim()) {
      throw new Error('Customer mobile number is required');
    }
    return true;
  }),
  body('customer.email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Customer email must be a valid email'),

  body().custom((val, { req }) => {
    const dev = req.body.device || req.body.handset;
    if (!dev || typeof dev !== 'object') {
      throw new Error('device or handset object is required');
    }
    if (!dev.brand || !dev.brand.trim()) {
      throw new Error('Device brand is required');
    }
    if (!dev.modelName || !dev.modelName.trim()) {
      throw new Error('Device model name is required');
    }
    const imei = dev.imei || dev.imeiNumber;
    if (imei && imei.trim()) {
      const cleanImei = imei.trim();
      if (cleanImei.length < 14 || cleanImei.length > 17) {
        throw new Error('IMEI must be 14-17 characters');
      }
    }
    return true;
  }),

  body('saleType')
    .optional()
    .isIn(['CASH', 'EMI'])
    .withMessage('saleType must be CASH or EMI'),

  body('emiTerms')
    .optional({ values: 'falsy' })
    .custom((emiTerms, { req }) => {
      if (req.body.saleType === 'CASH') return true;
      if (!emiTerms || typeof emiTerms !== 'object' || Object.keys(emiTerms).length === 0) {
        return true;
      }
      if (emiTerms.sellingPrice !== undefined) {
        if (isNaN(emiTerms.sellingPrice) || Number(emiTerms.sellingPrice) <= 0) {
          throw new Error('sellingPrice must be greater than 0');
        }
      } else {
        throw new Error('sellingPrice is required for EMI plan');
      }

      if (emiTerms.downPayment !== undefined && (isNaN(emiTerms.downPayment) || Number(emiTerms.downPayment) < 0)) {
        throw new Error('downPayment must be >= 0');
      }

      if (emiTerms.loanAmount !== undefined && (isNaN(emiTerms.loanAmount) || Number(emiTerms.loanAmount) < 0)) {
        throw new Error('loanAmount must be >= 0');
      }

      if (emiTerms.tenureMonths !== undefined) {
        const tenure = Number(emiTerms.tenureMonths);
        if (!Number.isInteger(tenure) || tenure < 1 || tenure > 120) {
          throw new Error('tenureMonths must be between 1 and 120');
        }
      } else {
        throw new Error('tenureMonths is required for EMI plan');
      }

      if (emiTerms.monthlyInstallment !== undefined && (isNaN(emiTerms.monthlyInstallment) || Number(emiTerms.monthlyInstallment) <= 0)) {
        throw new Error('monthlyInstallment must be greater than 0');
      }

      if (emiTerms.firstEmiDueDate !== undefined) {
        if (isNaN(Date.parse(emiTerms.firstEmiDueDate))) {
          throw new Error('firstEmiDueDate must be a valid ISO-8601 date');
        }
      } else {
        throw new Error('firstEmiDueDate is required for EMI plan');
      }

      return true;
    }),
];

const updateCustomerValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('mobileNumber').optional().trim().notEmpty().withMessage('Mobile number cannot be empty'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email must be valid'),
  body('address').optional({ values: 'falsy' }).isString(),
  body('aadhaarNumber').optional({ values: 'falsy' }).isString(),
  body('isActive').optional().isBoolean(),
];

const listCustomersValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['All', 'Active EMIs', 'Overdue', 'Paid Off']),
];

module.exports = { createCustomerValidator, updateCustomerValidator, listCustomersValidator };