'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * @param {Array} chains express-validator chains
 * @param {string} code   error code returned in the payload
 */
const validate = (chains, code = 'VALIDATION_ERROR') => async (req, _res, next) => {
  await Promise.all(chains.map((chain) => chain.run(req)));
  const result = validationResult(req);

  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(ApiError.badRequest('Invalid credentials or request payload', code, details));
};

module.exports = validate;