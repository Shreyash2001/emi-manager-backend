'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const authService = require('../services/auth.service');

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return success(res, { message: 'Login successful', data });
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getCurrentUser(req.user);
  return success(res, { message: 'User profile fetched', data });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.auth || {});
  return success(res, { message: 'Successfully logged out', data: null });
});

module.exports = { login, me, logout };