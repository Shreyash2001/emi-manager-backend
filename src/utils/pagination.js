'use strict';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getPagination(query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

function buildMeta(totalCount, page, limit) {
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  return { currentPage: page, totalPages, totalCount, hasMore: page < totalPages };
}

module.exports = { getPagination, buildMeta, DEFAULT_LIMIT, MAX_LIMIT };