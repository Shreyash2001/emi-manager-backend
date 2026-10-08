'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { success, created, paginated } = require('../utils/response');
const customerService = require('../services/customer.service');

const listCustomers = asyncHandler(async (req, res) => {
  const { items, pagination } = await customerService.listCustomers(req.storeId, req.query);
  return paginated(res, { items, pagination, message: 'Customers retrieved successfully' });
});

const createCustomer = asyncHandler(async (req, res) => {
  const data = await customerService.createCustomerWithPlan(req.storeId, req.body);
  let message;
  if (data.isExistingCustomer) {
    message = data.emiPlanId
      ? 'Device and EMI plan added to existing customer successfully'
      : 'Device added to existing customer successfully';
  } else {
    message = data.emiPlanId
      ? 'Customer and EMI plan created successfully'
      : 'Customer and handset saved successfully';
  }
  return created(res, { message, data });
});

const getCustomer = asyncHandler(async (req, res) => {
  const data = await customerService.getCustomerProfile(req.storeId, req.params.id);
  return success(res, { message: 'Customer profile fetched', data });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const data = await customerService.updateCustomer(req.storeId, req.params.id, req.body);
  return success(res, { message: 'Customer updated successfully', data });
});

module.exports = { listCustomers, createCustomer, getCustomer, updateCustomer };