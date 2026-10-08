'use strict';

const ApiError = require('../utils/ApiError');
const { toObjectId } = require('../utils/objectId');
const { round2 } = require('../utils/emi');
const Store = require('../models/Store');
const Customer = require('../models/Customer');
const EmiPlan = require('../models/EmiPlan');
const Payment = require('../models/Payment');

async function getDashboard(storeId) {
  const storeOid = toObjectId(storeId, 'storeId');

  const store = await Store.findById(storeOid).lean();
  if (!store) throw ApiError.notFound('Store not found', 'STORE_NOT_FOUND');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  try {
    const [
      totalCustomers,
      newCustomersThisMonth,
      activePlanAgg,
      overdueCount,
      collectionAgg,
      monthlyCollectionAgg,
      activeCustomerIds,
    ] = await Promise.all([
      Customer.countDocuments({ storeId: storeOid }),
      Customer.countDocuments({
        storeId: storeOid,
        createdAt: { $gte: monthStart, $lt: monthEnd },
      }),
      EmiPlan.aggregate([
        { $match: { storeId: storeOid, status: { $ne: 'CLEARED' } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            financed: { $sum: '$loanAmount' },
            outstanding: { $sum: { $subtract: ['$loanAmount', '$paidAmount'] } },
          },
        },
      ]),
      EmiPlan.countDocuments({ storeId: storeOid, status: 'OVERDUE' }),
      Payment.aggregate([
        { $match: { storeId: storeOid } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { storeId: storeOid, paymentDate: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      EmiPlan.distinct('customerId', { storeId: storeOid, status: { $ne: 'CLEARED' } }),
    ]);

    const planAgg = activePlanAgg[0] || { count: 0, financed: 0, outstanding: 0 };
    const totalCollection = collectionAgg[0]?.total || 0;
    const monthlyCollection = monthlyCollectionAgg[0]?.total || 0;

    return {
      totalCustomers,
      newCustomersThisMonth,
      activeCustomers: activeCustomerIds.length,
      activeEmis: planAgg.count,
      activeLoanAmount: round2(planAgg.financed),
      totalCollection: round2(totalCollection),
      pendingAmount: round2(planAgg.outstanding),
      overdueCount,
      monthlyCollection: round2(monthlyCollection),
      storeName: store.name,
      storeLocation: store.address || null,
      ownerName: store.ownerName,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }

}

module.exports = { getDashboard };