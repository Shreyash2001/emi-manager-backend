'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const reportService = require('../services/report.service');

const getSummary = asyncHandler(async (req, res) => {
  const data = await reportService.getSummary(req.storeId);
  return success(res, { message: 'Reports summary fetched', data });
});

const getMonthlyTrend = asyncHandler(async (req, res) => {
  const data = await reportService.getMonthlyTrend(req.storeId, req.query.year);
  return success(res, { message: 'Monthly trend retrieved', data });
});

const getWeeklyCollection = asyncHandler(async (req, res) => {
  const data = await reportService.getWeeklyCollection(req.storeId);
  return success(res, { message: 'Weekly collection retrieved', data });
});

const getSmartphones = asyncHandler(async (req, res) => {
  const data = await reportService.getSmartphoneBreakdown(req.storeId);
  return success(res, { message: 'Smartphone breakdown retrieved', data });
});

module.exports = { getSummary, getMonthlyTrend, getWeeklyCollection, getSmartphones };