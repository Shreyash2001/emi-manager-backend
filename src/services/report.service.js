'use strict';

const ApiError = require('../utils/ApiError');
const { toObjectId } = require('../utils/objectId');
const { round2, MONTHS_SHORT } = require('../utils/emi');

const Customer = require('../models/Customer');
const Handset = require('../models/Handset');
const EmiPlan = require('../models/EmiPlan');
const Payment = require('../models/Payment');

async function getSummary(storeId) {
  const storeOid = toObjectId(storeId, 'storeId');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalRevenueAgg,
    monthlyRevenueAgg,
    totalCustomers,
    activeEmiPlans,
    planAgg,
    overdueAgg,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { storeId: storeOid } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { storeId: storeOid, paymentDate: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Customer.countDocuments({ storeId: storeOid }),
    EmiPlan.countDocuments({ storeId: storeOid, status: { $ne: 'CLEARED' } }),
    EmiPlan.aggregate([
      { $match: { storeId: storeOid } },
      { $group: { _id: null, financed: { $sum: '$loanAmount' }, paid: { $sum: '$paidAmount' } } },
    ]),
    EmiPlan.aggregate([
      { $match: { storeId: storeOid, status: 'OVERDUE' } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$loanAmount', '$paidAmount'] } } } },
    ]),
  ]);

  const financed = planAgg[0]?.financed || 0;
  const paid = planAgg[0]?.paid || 0;
  const collectionRate = financed > 0 ? round2((paid / financed) * 100) : 0;

  return {
    totalRevenue: round2(totalRevenueAgg[0]?.total || 0),
    monthlyRevenue: round2(monthlyRevenueAgg[0]?.total || 0),
    totalCustomers,
    activeEmiPlans,
    collectionRate,
    overdueAmount: round2(overdueAgg[0]?.total || 0),
  };
}

async function getMonthlyTrend(storeId, year) {
  const storeOid = toObjectId(storeId, 'storeId');
  const targetYear = parseInt(year, 10) || new Date().getFullYear();

  const rangeStart = new Date(Date.UTC(targetYear, 0, 1));
  const rangeEnd = new Date(Date.UTC(targetYear + 1, 0, 1));

  const [collected, pending] = await Promise.all([
    Payment.aggregate([
      { $match: { storeId: storeOid, paymentDate: { $gte: rangeStart, $lt: rangeEnd } } },
      {
        $group: {
          _id: { $month: { date: '$paymentDate', timezone: 'UTC' } },
          total: { $sum: '$amount' },
        },
      },
    ]),
    EmiPlan.aggregate([
      {
        $match: {
          storeId: storeOid,
          status: { $ne: 'CLEARED' },
          nextDueDate: { $gte: rangeStart, $lt: rangeEnd },
        },
      },
      {
        $group: {
          _id: { $month: { date: '$nextDueDate', timezone: 'UTC' } },
          total: { $sum: '$monthlyInstallment' },
        },
      },
    ]),
  ]);

  const collectedMap = new Map(collected.map((c) => [c._id, c.total]));
  const pendingMap = new Map(pending.map((p) => [p._id, p.total]));

  return MONTHS_SHORT.map((month, idx) => ({
    month,
    collected: round2(collectedMap.get(idx + 1) || 0),
    pending: round2(pendingMap.get(idx + 1) || 0),
  }));
}

async function getWeeklyCollection(storeId, reference = new Date()) {
  const storeOid = toObjectId(storeId, 'storeId');

  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));

  const weeks = [];
  let cursor = new Date(start);
  let index = 1;
  while (cursor < end) {
    const next = new Date(cursor);
    next.setUTCDate(next.getUTCDate() + 7);
    const weekEnd = next > end ? end : next;
    weeks.push({ label: `Week ${index}`, start: new Date(cursor), end: new Date(weekEnd) });
    cursor = next;
    index += 1;
  }

  const results = await Promise.all(
    weeks.map((w) =>
      Payment.aggregate([
        {
          $match: {
            storeId: storeOid,
            paymentDate: { $gte: w.start, $lt: w.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
    )
  );

  return weeks.map((w, i) => ({ week: w.label, amount: round2(results[i][0]?.total || 0) }));
}

async function getSmartphoneBreakdown(storeId) {
  const storeOid = toObjectId(storeId, 'storeId');

  const handsetCount = await Handset.countDocuments({ storeId: storeOid });
  let rows;
  if (handsetCount > 0) {
    rows = await Handset.aggregate([
      { $match: { storeId: storeOid } },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ['$sellingPrice', 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);
  } else {
    rows = await EmiPlan.aggregate([
      { $match: { storeId: storeOid } },
      {
        $group: {
          _id: '$handset.brand',
          count: { $sum: 1 },
          totalValue: { $sum: '$sellingPrice' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  return rows.map((r) => ({
    brand: r._id || 'Unknown',
    count: r.count,
    totalValue: round2(r.totalValue),
  }));
}

module.exports = { getSummary, getMonthlyTrend, getWeeklyCollection, getSmartphoneBreakdown };