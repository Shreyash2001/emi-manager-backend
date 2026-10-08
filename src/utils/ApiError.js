'use strict';

class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_SERVER_ERROR', details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    if (details) this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'VALIDATION_ERROR', details) {
    return new ApiError(400, message, code, details);
  }
  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }
  static forbidden(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }
  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }
  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }
  static internal(message = 'Something went wrong', code = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(500, message, code);
  }
}

module.exports = ApiError;