'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ------------------------------ Security ------------------------------ */
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(compression());

/* ------------------------------ Parsing ------------------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ------------------------------ Logging ------------------------------- */
if (config.NODE_ENV !== 'test') {
  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

/* ---------------------------- Rate limiting --------------------------- */
// Temporary flag check to skip rate limiting during local testing
if (!config.DISABLE_RATE_LIMIT) {
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests. Please try again later.',
        error: { code: 'RATE_LIMITED' },
      },
    })
  );
}

/* ------------------------------- Health ------------------------------- */
app.get('/health', (_req, res) =>
  res.status(200).json({
    success: true,
    message: 'Service healthy',
    data: { uptime: process.uptime(), timestamp: new Date().toISOString() },
  })
);

/* ------------------------------- Routes ------------------------------- */
app.use(config.API_PREFIX, routes);

/* ------------------------------- Errors ------------------------------- */
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;