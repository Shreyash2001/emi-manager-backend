'use strict';

const http = require('http');
const app = require('./src/app');
const config = require('./src/config/env');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

(async () => {
  await connectDB();

  const server = http.createServer(app);
  server.listen(config.PORT, () => {
    logger.info(`🚀 API running in ${config.NODE_ENV} mode on port ${config.PORT}`);
    logger.info(`   Base URL: http://localhost:${config.PORT}${config.API_PREFIX}`);
  });

  const shutdown = (signal) => {
    logger.warn(`${signal} received — shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    shutdown('unhandledRejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    shutdown('uncaughtException');
  });
})();