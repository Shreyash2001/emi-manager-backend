'use strict';

const ApiError = require('../utils/ApiError');
const { toObjectId } = require('../utils/objectId');
const { round2, computeEmiStatus, addMonths } = require('../utils/emi');
const { deviceDisplayName } = require('../utils/string');

const EmiPlan = require('../models/EmiPlan');

async function getPlanDetails(storeId, planId) {
  const storeOid = toObjectId(storeId, 'storeId');
  const pid = toObjectId(planId, 'emiPlanId');

  const plan = await EmiPlan.findOne({ _id: pid, storeId: storeOid })
    .populate('customerId', 'name mobileNumber')
    .lean();

  if (!plan) throw ApiError.notFound('EMI plan not found', 'EMI_PLAN_NOT_FOUND');

  return {
    id: String(plan._id),
    customerId: String(plan.customerId?._id || plan.customerId),
    customerName: plan.customerId?.name ?? null,
    handsetBrand: plan.handset.brand,
    handsetModel: deviceDisplayName(plan.handset),
    handsetVariant: plan.handset.variant ?? null,
    imei: plan.handset?.imei ?? null,
    totalAmount: round2(plan.loanAmount),
    sellingPrice: round2(plan.sellingPrice),
    downPayment: round2(plan.downPayment),
    emiAmount: round2(plan.monthlyInstallment),
    totalInstallments: plan.tenureMonths,
    paidInstallments: plan.paidInstallments,
    remainingInstallments: Math.max(plan.tenureMonths - plan.paidInstallments, 0),
    paidAmount: round2(plan.paidAmount),
    outstandingAmount: round2(Math.max(plan.loanAmount - plan.paidAmount, 0)),
    status: plan.status,
    startDate: plan.startDate,
    firstEmiDueDate: plan.firstEmiDueDate,
    nextDueDate: plan.nextDueDate,
    clearedAt: plan.clearedAt,
    notes: plan.notes,
    updatedAt: plan.updatedAt,
  };
}

async function updatePlanStatus(storeId, planId, { status, notes }) {
  const storeOid = toObjectId(storeId, 'storeId');
  const pid = toObjectId(planId, 'emiPlanId');

  const plan = await EmiPlan.findOne({ _id: pid, storeId: storeOid });
  if (!plan) throw ApiError.notFound('EMI plan not found', 'EMI_PLAN_NOT_FOUND');

  if (status === 'CLEARED') {
    plan.paidInstallments = plan.tenureMonths;
    plan.paidAmount = plan.loanAmount;
    plan.nextDueDate = null;
    plan.clearedAt = new Date();
    plan.status = 'CLEARED';
  } else {
    plan.clearedAt = null;
    plan.nextDueDate = plan.nextDueDate || addMonths(plan.firstEmiDueDate, plan.paidInstallments);
    plan.status =
      status === 'ON_TRACK' || status === 'OVERDUE' || status === 'DUE_TODAY'
        ? computeEmiStatus(plan, new Date())
        : status;
  }

  if (notes !== undefined) plan.notes = notes || null;

  await plan.save();

  return {
    id: String(plan._id),
    status: plan.status,
    paidInstallments: plan.paidInstallments,
    remainingInstallments: Math.max(plan.tenureMonths - plan.paidInstallments, 0),
    outstandingAmount: round2(Math.max(plan.loanAmount - plan.paidAmount, 0)),
    updatedAt: plan.updatedAt,
  };
}

module.exports = { getPlanDetails, updatePlanStatus };