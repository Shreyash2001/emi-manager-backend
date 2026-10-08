'use strict';

const ApiError = require('../utils/ApiError');
const { toObjectId } = require('../utils/objectId');
const { round2, addMonths, computeEmiStatus } = require('../utils/emi');
const { escapeRegex } = require('../utils/string');
const { getPagination, buildMeta } = require('../utils/pagination');
const config = require('../config/env');

const Counter = require('../models/Counter');
const Payment = require('../models/Payment');
const EmiPlan = require('../models/EmiPlan');
const Customer = require('../models/Customer');

const METHOD_LABELS = {
  CASH: 'Counter Cash',
  UPI: 'UPI Paid',
  UPI_AUTOPAY: 'UPI AutoPay',
  CARD: 'POS Swipe',
};

function methodLabel(method) {
  return METHOD_LABELS[method] || method;
}

/** Human friendly reference shown in the ledger. */
function paymentReferenceLabel(payment) {
  if (payment.transactionReference) return payment.transactionReference;
  switch (payment.paymentMethod) {
    case 'CASH':
      return 'Store Receipt';
    case 'UPI_AUTOPAY':
      return 'Mandate';
    case 'CARD':
      return 'POS Swipe';
    default:
      return payment.receiptNumber;
  }
}

async function generateReceiptNumber() {
  const seq = await Counter.next('receipt');
  return `REC-${String(seq).padStart(4, '0')}`;
}

/**
 * Low-level payment creation. Used by both the payment endpoint and
 * the customer-creation flow (down payment).
 */
async function createPaymentDoc({
  storeId,
  customer,
  plan,
  amount,
  paymentMethod,
  paymentType = 'EMI',
  installmentNumber = null,
  paymentDate = new Date(),
  transactionReference = null,
  notes = null,
  status = 'PAID',
  recordedBy = null,
}) {
  const receiptNumber = await generateReceiptNumber();

  const payment = await Payment.create({
    storeId,
    customerId: customer._id,
    emiPlanId: plan._id,
    amount: round2(amount),
    paymentMethod,
    paymentType,
    installmentNumber,
    paymentDate,
    transactionReference,
    receiptNumber,
    notes,
    status,
    recordedBy,
  });

  return payment;
}

/** Recalculates the EMI plan state (installments, due date, status). */
async function applyPaymentToPlan(plan, { amount, paymentType, paymentDate }) {
  if (paymentType !== 'EMI') return plan;

  plan.paidInstallments = Math.min(plan.paidInstallments + 1, plan.tenureMonths);
  plan.paidAmount = round2(plan.paidAmount + amount);

  if (plan.paidInstallments >= plan.tenureMonths) {
    plan.status = 'CLEARED';
    plan.nextDueDate = null;
    plan.clearedAt = new Date();
  } else {
    plan.nextDueDate = addMonths(plan.firstEmiDueDate, plan.paidInstallments);
    plan.status = computeEmiStatus(plan, paymentDate || new Date());
    plan.clearedAt = null;
  }

  await plan.save();
  return plan;
}

/** Trust score metric has been deprecated and removed. */
async function adjustTrustScore(customer) {
  return customer;
}

function serializePayment(payment) {
  const customerId = payment.customerId?._id ?? payment.customerId;
  const emiPlanId = payment.emiPlanId?._id ?? payment.emiPlanId;

  return {
    id: String(payment._id),
    customerId: customerId ? String(customerId) : null,
    emiPlanId: emiPlanId ? String(emiPlanId) : null,
    amount: round2(payment.amount),
    method: payment.paymentMethod,
    methodLabel: methodLabel(payment.paymentMethod),
    paymentType: payment.paymentType,
    installmentNumber: payment.installmentNumber,
    paymentDate: payment.paymentDate,
    status: payment.status,
    receiptNumber: payment.receiptNumber,
    receiptUrl: `${config.RECEIPT_BASE_URL}/${payment.receiptNumber}.pdf`,
    transactionReference: payment.transactionReference,
    notes: payment.notes,
  };
}

async function recordPayment(storeId, user, payload) {
  const storeOid = toObjectId(storeId, 'storeId');

  const [plan, customer] = await Promise.all([
    EmiPlan.findOne({ _id: payload.emiPlanId, storeId: storeOid }),
    Customer.findOne({ _id: payload.customerId, storeId: storeOid }),
  ]);

  if (!plan) throw ApiError.notFound('EMI plan not found', 'EMI_PLAN_NOT_FOUND');
  if (!customer) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  if (String(plan.customerId) !== String(customer._id)) {
    throw ApiError.badRequest(
      'EMI plan does not belong to the specified customer',
      'PLAN_CUSTOMER_MISMATCH'
    );
  }

  if (plan.status === 'CLEARED') {
    throw ApiError.conflict('EMI plan is already cleared', 'EMI_PLAN_CLEARED');
  }

  const paymentType = payload.paymentType || 'EMI';
  let installmentNumber = null;

  if (paymentType === 'EMI') {
    installmentNumber = payload.installmentNumber ?? plan.paidInstallments + 1;
    if (installmentNumber > plan.tenureMonths) {
      throw ApiError.badRequest(
        'Installment number exceeds the EMI tenure',
        'INSTALLMENT_OUT_OF_RANGE'
      );
    }
    if (installmentNumber <= plan.paidInstallments) {
      throw ApiError.conflict(
        `Installment #${installmentNumber} has already been paid`,
        'INSTALLMENT_ALREADY_PAID'
      );
    }
  }

  const paymentDate = payload.paymentDate ? new Date(payload.paymentDate) : new Date();

  const payment = await createPaymentDoc({
    storeId: storeOid,
    customer,
    plan,
    amount: payload.amount,
    paymentMethod: payload.paymentMethod,
    paymentType,
    installmentNumber,
    paymentDate,
    transactionReference: payload.transactionReference || null,
    notes: payload.notes || null,
    status: paymentType === 'DOWN_PAYMENT' ? 'SETTLED' : 'PAID',
    recordedBy: user?._id || null,
  });

  await applyPaymentToPlan(plan, { amount: payload.amount, paymentType, paymentDate });

  return {
    ...serializePayment(payment),
    customerName: customer.name,
    plan: {
      id: String(plan._id),
      paidInstallments: plan.paidInstallments,
      remainingInstallments: Math.max(plan.tenureMonths - plan.paidInstallments, 0),
      outstandingAmount: round2(Math.max(plan.loanAmount - plan.paidAmount, 0)),
      nextDueDate: plan.nextDueDate,
      status: plan.status,
    },
  };
}

async function listPayments(storeId, query) {
  const storeOid = toObjectId(storeId, 'storeId');
  const { page, limit, skip } = getPagination(query);

  const filter = { storeId: storeOid };
  if (query.emiPlanId) filter.emiPlanId = toObjectId(query.emiPlanId, 'emiPlanId');
  if (query.customerId) filter.customerId = toObjectId(query.customerId, 'customerId');

  const search = (query.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const matchedCustomers = await Customer.find({
      storeId: storeOid,
      $or: [{ name: rx }, { mobileNumber: rx }],
    })
      .select('_id')
      .lean();

    filter.$or = [
      { receiptNumber: rx },
      { transactionReference: rx },
      { customerId: { $in: matchedCustomers.map((c) => c._id) } },
    ];
  }

  const [payments, totalCount] = await Promise.all([
    Payment.find(filter)
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name')
      .lean(),
    Payment.countDocuments(filter),
  ]);

  const items = payments.map((p) => ({
    ...serializePayment(p),
    customerName: p.customerId?.name ?? null,
  }));

  return { items, pagination: buildMeta(totalCount, page, limit) };
}

async function getPaymentDetails(storeId, paymentId) {
  const storeOid = toObjectId(storeId, 'storeId');
  const payment = await Payment.findOne({ _id: paymentId, storeId: storeOid })
    .populate('customerId', 'name mobileNumber')
    .populate('emiPlanId', 'handset loanAmount paidAmount monthlyInstallment tenureMonths')
    .lean();

  if (!payment) throw ApiError.notFound('Payment not found', 'PAYMENT_NOT_FOUND');

  const plan = payment.emiPlanId;
  const remainingOutstanding = plan ? Math.max(plan.loanAmount - plan.paidAmount, 0) : 0;

  return {
    id: String(payment._id),
    transactionRef: payment.transactionReference || payment.receiptNumber,
    receiptNumber: payment.receiptNumber,
    receiptUrl: `${config.RECEIPT_BASE_URL}/${payment.receiptNumber}.pdf`,
    customer: payment.customerId
      ? {
        id: String(payment.customerId._id),
        name: payment.customerId.name,
        phone: payment.customerId.mobileNumber,
      }
      : null,
    device: plan
      ? {
        model: plan.handset?.modelName ?? null,
        brand: plan.handset?.brand ?? null,
        imei: plan.handset?.imei ?? null,
      }
      : null,
    installmentLabel:
      payment.paymentType === 'DOWN_PAYMENT'
        ? 'Initial Down Payment'
        : `EMI #${payment.installmentNumber}`,
    amountPaid: round2(payment.amount),
    paymentMethod: methodLabel(payment.paymentMethod),
    paymentMethodCode: payment.paymentMethod,
    paymentDate: payment.paymentDate,
    status: payment.status,
    remainingOutstanding: round2(remainingOutstanding),
  };
}

module.exports = {
  recordPayment,
  listPayments,
  getPaymentDetails,
  createPaymentDoc,
  applyPaymentToPlan,
  adjustTrustScore,
  serializePayment,
  methodLabel,
  paymentReferenceLabel,
  METHOD_LABELS,
};