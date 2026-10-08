'use strict';

const { body } = require('express-validator');

const loginValidator = [
  body('mobileNumber')
    .exists({ checkFalsy: true })
    .withMessage('Mobile number is required')
    .bail()
    .isString()
    .withMessage('Mobile number must be a string')
    .bail()
    .matches(/^[+\d][\d\s-]{8,15}$/)
    .withMessage('Mobile number must be a valid 10-digit number'),
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters'),
];

module.exports = { loginValidator };