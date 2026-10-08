'use strict';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const current =
  LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? 2 : 3);

const stamp = () => new Date().toISOString();

module.exports = {
  error: (...args) => current >= 0 && console.error(`[${stamp()}] [ERROR]`, ...args),
  warn: (...args) => current >= 1 && console.warn(`[${stamp()}] [WARN ]`, ...args),
  info: (...args) => current >= 2 && console.log(`[${stamp()}] [INFO ]`, ...args),
  debug: (...args) => current >= 3 && console.log(`[${stamp()}] [DEBUG]`, ...args),
};