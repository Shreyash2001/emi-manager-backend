'use strict';

const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const { normalizeMobile } = require('../utils/string');
const User = require('../models/User');
const Store = require('../models/Store');
const RevokedToken = require('../models/RevokedToken');

function buildUserPayload(user, store) {
  return {
    id: String(user._id),
    name: user.name,
    mobileNumber: user.mobileNumber,
    role: user.role,
    storeId: store ? String(store._id) : null,
    storeName: store ? store.name : null,
    profileImageUrl: user.profileImageUrl ?? null,
    theme: store
      ? store.themeJSON()
      : {
        primaryColor: config.DEFAULT_THEME.primaryColor,
        secondaryColor: config.DEFAULT_THEME.secondaryColor,
        accentColor: config.DEFAULT_THEME.accentColor,
        backgroundColor: config.DEFAULT_THEME.backgroundColor,
        logoUrl: null,
      },
  };
}

async function login({ mobileNumber, password }) {
  const normalized = normalizeMobile(mobileNumber);

  const user = await User.findOne({ mobileNumber: normalized }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid mobile number or password', 'INVALID_CREDENTIALS');

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('Invalid mobile number or password', 'INVALID_CREDENTIALS');

  if (!user.isActive) {
    throw ApiError.forbidden('Account is deactivated. Contact platform support.', 'ACCOUNT_INACTIVE');
  }

  let store = null;
  if (user.storeId) {
    store = await Store.findById(user.storeId);
    if (!store) throw ApiError.unauthorized('Store not found for this account', 'STORE_NOT_FOUND');
    if (store.status === 'SUSPENDED') {
      throw ApiError.forbidden('Store account is suspended. Contact platform support.', 'STORE_SUSPENDED');
    }
  }

  const jti = randomUUID();
  const accessToken = jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      storeId: user.storeId ? String(user.storeId) : null,
      jti,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { accessToken, user: buildUserPayload(user, store) };
}

async function getCurrentUser(user) {
  const storeId = user.storeId ? (user.storeId._id || user.storeId) : null;
  const store = storeId ? await Store.findById(storeId) : null;
  return buildUserPayload(user, store);
}

async function logout({ jti, exp }) {
  if (!jti) return;
  const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 7 * 86400000);
  await RevokedToken.updateOne(
    { jti },
    { $setOnInsert: { jti, expiresAt } },
    { upsert: true }
  );
}

module.exports = { login, getCurrentUser, logout, buildUserPayload };