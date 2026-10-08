'use strict';

require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: toInt(process.env.PORT, 5000),
  API_PREFIX: '/api/v1',

  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mobile_shop_emi',

  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: toInt(process.env.BCRYPT_ROUNDS, 10),

  RECEIPT_BASE_URL: process.env.RECEIPT_BASE_URL || 'http://localhost:5000/receipts',

  DEFAULT_THEME: {
    primaryColor: '#6C5CE7',
    secondaryColor: '#111827',
    accentColor: '#F59E0B',
    backgroundColor: '#F8FAFC',
    logoUrl: null,
  },

  // Temporary flag to disable rate limiting for local testing
  DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT !== undefined
    ? process.env.DISABLE_RATE_LIMIT === 'true'
    : true,
};