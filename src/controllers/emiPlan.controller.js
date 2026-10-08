'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const emiPlanService = require('../services/emiPlan.service');

const getEmiPlan = asyncHandler(async (req, res) => {
  const data = await emiPlanService.getPlanDetails(req.storeId, req.params.id);
  return success(res, { message: 'EMI Plan details retrieved', data });
});

const updateEmiPlan = asyncHandler(async (req, res) => {
  const data = await emiPlanService.updatePlanStatus(req.storeId, req.params.id, req.body);
  return success(res, { message: `EMI plan status updated to ${data.status}`, data });
});

module.exports = { getEmiPlan, updateEmiPlan };