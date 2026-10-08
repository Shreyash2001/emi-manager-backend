'use strict';

const ApiError = require('../utils/ApiError');

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(`This action requires one of: ${roles.join(', ')}`, 'INSUFFICIENT_ROLE')
    );
  }
  return next();
};

module.exports = { requireRole };