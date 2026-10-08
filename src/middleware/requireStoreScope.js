'use strict';

const ApiError = require('../utils/ApiError');

/** Guarantees a store context exists on the request (multi-tenant isolation). */
const requireStoreScope = (req, _res, next) => {
  if (!req.storeId) {
    return next(
      ApiError.forbidden('No store is associated with this account', 'STORE_SCOPE_MISSING')
    );
  }
  return next();
};

module.exports = { requireStoreScope };