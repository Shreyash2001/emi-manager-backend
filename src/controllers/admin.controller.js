'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { success, created, paginated } = require('../utils/response');
const adminService = require('../services/admin.service');

const getDashboard = asyncHandler(async (_req, res) => {
  const data = await adminService.getDashboard();
  return success(res, { message: 'Admin dashboard metrics retrieved', data });
});

const listStores = asyncHandler(async (req, res) => {
  const { items, pagination } = await adminService.listStores(req.query);
  return paginated(res, { items, pagination, message: 'Stores retrieved' });
});

const createStore = asyncHandler(async (req, res) => {
  const data = await adminService.createStore(req.body);
  return created(res, { message: 'Store created successfully', data });
});

const updateStore = asyncHandler(async (req, res) => {
  const data = await adminService.updateStore(req.params.id, req.body);
  return success(res, { message: 'Store details updated successfully', data });
});

const updateStoreStatus = asyncHandler(async (req, res) => {
  const data = await adminService.updateStoreStatus(req.params.id, req.body);
  return success(res, { message: `Store status updated to ${data.status}`, data });
});

const resetPassword = asyncHandler(async (req, res) => {
  await adminService.resetStoreOwnerPassword(req.params.id, req.body);
  return success(res, { message: 'Store password reset successfully', data: null });
});

const updateTheme = asyncHandler(async (req, res) => {
  const data = await adminService.updateStoreTheme(req.params.id, req.body);
  return success(res, { message: 'Store theme updated successfully', data });
});

module.exports = {
  getDashboard,
  listStores,
  createStore,
  updateStore,
  updateStoreStatus,
  resetPassword,
  updateTheme,
};