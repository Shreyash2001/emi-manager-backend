'use strict';

const { body, query } = require('express-validator');

const createStoreValidator = [
  body('storeName').trim().notEmpty().withMessage('storeName is required'),
  body('ownerName').trim().notEmpty().withMessage('ownerName is required'),
  body('mobileNumber')
    .trim()
    .notEmpty()
    .withMessage('mobileNumber is required')
    .bail()
    .matches(/^[+\d][\d\s-]{8,15}$/)
    .withMessage('mobileNumber must be valid'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('password must be at least 6 characters'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('email must be valid'),
  body('address').optional({ values: 'falsy' }).isString(),
];

const updateStoreStatusValidator = [
  body('status')
    .isIn(['ACTIVE', 'SUSPENDED'])
    .withMessage('status must be ACTIVE or SUSPENDED'),
  body('reason').optional({ values: 'falsy' }).isString(),
];

const resetPasswordValidator = [
  body('newPassword')
    .isString()
    .isLength({ min: 6 })
    .withMessage('newPassword must be at least 6 characters'),
];

const updateThemeValidator = [
  body('primaryColor').optional().matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/).withMessage('primaryColor must be a hex color'),
  body('secondaryColor').optional().matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/).withMessage('secondaryColor must be a hex color'),
  body('accentColor').optional().matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/).withMessage('accentColor must be a hex color'),
  body('backgroundColor').optional().matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/).withMessage('backgroundColor must be a hex color'),
  body('logoUrl').optional({ values: 'falsy' }).isURL().withMessage('logoUrl must be a valid URL'),
];

const listStoresValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const updateStoreValidator = [
  body('storeName').optional().trim().notEmpty().withMessage('storeName cannot be empty'),
  body('ownerName').optional().trim().notEmpty().withMessage('ownerName cannot be empty'),
  body('mobileNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('mobileNumber cannot be empty')
    .bail()
    .matches(/^[+\d][\d\s-]{8,15}$/)
    .withMessage('mobileNumber must be valid'),
  body('password')
    .optional()
    .isString()
    .isLength({ min: 6 })
    .withMessage('password must be at least 6 characters'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('email must be valid'),
  body('address').optional({ values: 'falsy' }).isString(),
];

module.exports = {
  createStoreValidator,
  updateStoreValidator,
  updateStoreStatusValidator,
  resetPasswordValidator,
  updateThemeValidator,
  listStoresValidator,
};