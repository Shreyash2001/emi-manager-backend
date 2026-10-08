'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const dashboardService = require('../services/dashboard.service');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboard(req.storeId);
  return success(res, { message: 'Dashboard metrics retrieved', data });
});

module.exports = { getDashboard };