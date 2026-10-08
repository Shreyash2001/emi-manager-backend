'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { success, created, paginated } = require('../utils/response');
const paymentService = require('../services/payment.service');

const recordPayment = asyncHandler(async (req, res) => {
  const data = await paymentService.recordPayment(req.storeId, req.user, req.body);
  return created(res, { message: 'Payment recorded successfully', data });
});

const listPayments = asyncHandler(async (req, res) => {
  const { items, pagination } = await paymentService.listPayments(req.storeId, req.query);
  return paginated(res, { items, pagination, message: 'Payment history retrieved' });
});

const getPayment = asyncHandler(async (req, res) => {
  const data = await paymentService.getPaymentDetails(req.storeId, req.params.id);
  return success(res, { message: 'Payment details retrieved', data });
});

module.exports = { recordPayment, listPayments, getPayment };