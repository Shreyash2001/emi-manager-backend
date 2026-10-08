'use strict';

const { body } = require('express-validator');

const updateEmiPlanValidator = [
  body('status')
    .exists()
    .withMessage('status is required')
    .bail()
    .isIn(['ON_TRACK', 'DUE_TODAY', 'OVERDUE', 'CLEARED'])
    .withMessage('status must be one of ON_TRACK, DUE_TODAY, OVERDUE, CLEARED'),
  body('notes').optional({ values: 'falsy' }).isString(),
];

module.exports = { updateEmiPlanValidator };