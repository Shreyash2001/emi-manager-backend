'use strict';

const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config/env');

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;

  if (error.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`, 'INVALID_ID');
  } else if (error.name === 'ValidationError' && error.errors) {
    error = ApiError.badRequest(
      'Validation failed',
      'VALIDATION_ERROR',
      Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  } else if (error.code === 11000) {
    const fields = Object.keys(error.keyValue || {}).join(', ') || 'field';
    error = ApiError.conflict(`Duplicate value for ${fields}`, 'DUPLICATE_KEY');
  } else if (!(error instanceof ApiError)) {
    error = ApiError.internal(
      config.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    );
  }

  if (error.statusCode >= 500) logger.error(err);

  const body = {
    success: false,
    message: error.message,
    error: { code: error.code },
  };
  if (error.details) body.error.details = error.details;
  if (config.NODE_ENV !== 'production' && error.statusCode >= 500) body.error.stack = err.stack;

  res.status(error.statusCode || 500).json(body);
}

module.exports = { notFoundHandler, errorHandler };