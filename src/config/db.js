'use strict';

const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(config.MONGO_URI, {
      autoIndex: config.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 15000,
    });
    logger.info(`✅ MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    logger.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => logger.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('🔄 MongoDB reconnected'));
}

module.exports = connectDB;