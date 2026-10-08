'use strict';

/** Wraps an async express handler and forwards rejections to next(). */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);