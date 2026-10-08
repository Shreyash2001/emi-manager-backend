'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const RevokedToken = require('../models/RevokedToken');

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header', 'AUTH_TOKEN_MISSING');
  }

  const token = header.slice(7).trim();
  let payload;

  try {
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Access token has expired' : 'Invalid access token',
      err.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID'
    );
  }

  if (payload.jti && (await RevokedToken.exists({ jti: payload.jti }))) {
    throw ApiError.unauthorized('Access token has been revoked', 'AUTH_TOKEN_REVOKED');
  }

  const user = await User.findById(payload.sub).populate('storeId');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User account is inactive or no longer exists', 'AUTH_USER_INACTIVE');
  }

  // Tenant-level suspension check (super admins are exempt).
  if (user.role !== 'SUPER_ADMIN' && user.storeId && user.storeId.status === 'SUSPENDED') {
    throw ApiError.forbidden('Store account is suspended. Contact platform support.', 'STORE_SUSPENDED');
  }

  req.user = user;
  req.auth = { token, jti: payload.jti, exp: payload.exp };
  req.storeId = user.storeId ? (user.storeId._id || user.storeId) : null;

  return next();
});

module.exports = { authenticate };