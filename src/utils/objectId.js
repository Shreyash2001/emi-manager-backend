'use strict';

const mongoose = require('mongoose');
const ApiError = require('./ApiError');

function toObjectId(id, field = 'id') {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw ApiError.badRequest(`Invalid ${field}`, 'INVALID_ID');
  }
  return new mongoose.Types.ObjectId(String(id));
}

module.exports = { toObjectId };