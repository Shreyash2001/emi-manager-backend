'use strict';

const success = (res, { message = 'Operation completed successfully', data = {}, statusCode = 200 } = {}) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, { message = 'Resource created successfully', data = {} } = {}) =>
  success(res, { message, data, statusCode: 201 });

const paginated = (res, { items = [], pagination, message = 'Items retrieved successfully' } = {}) =>
  res.status(200).json({ success: true, message, data: { items, pagination } });

module.exports = { success, created, paginated };