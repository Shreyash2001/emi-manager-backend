'use strict';

const ApiError = require('../utils/ApiError');
const { toObjectId } = require('../utils/objectId');
const { getPagination, buildMeta } = require('../utils/pagination');
const {
  round2,
  computeEmiStatus,
  daysBetween,
  formatDate,
  isSameDay,
} = require('../utils/emi');
const {
  escapeRegex,
  normalizeMobile,
  initialsOf,
  deviceDisplayName,
} = require('../utils/string');

const Customer = require('../models/Customer');
const EmiPlan = require('../models/EmiPlan');
const Handset = require('../models/Handset');
const Payment = require('../models/Payment');

const paymentService = require('./payment.service');

const CATEGORY_STATUS_MAP = {
  'Active EMIs': ['ON_TRACK', 'DUE_TODAY', 'OVERDUE'],
  Overdue: ['OVERDUE'],
  'Paid Off': ['CLEARED'],
};

/* ------------------------------------------------------------------ */
/* Serialisation helpers                                              */
/* ------------------------------------------------------------------ */

function formatEmiPlan(plan, now = new Date()) {
  if (!plan) return null;
  const outstanding = Math.max((plan.loanAmount || 0) - (plan.paidAmount || 0), 0);
  const currentEmiNumber = Math.min((plan.paidInstallments || 0) + 1, plan.tenureMonths || 1);
  const overdueDays =
    plan.status === 'OVERDUE' && plan.nextDueDate ? daysBetween(plan.nextDueDate, now) : 0;

  return {
    id: String(plan._id),
    planId: String(plan._id),
    handset: {
      brand: plan.handset?.brand,
      modelName: plan.handset?.modelName,
      variant: plan.handset?.variant ?? null,
      storage: plan.handset?.storage ?? null,
      color: plan.handset?.color ?? null,
      imei: plan.handset?.imei,
      serialNumber: plan.handset?.serialNumber ?? null,
      warrantyMonths: plan.handset?.warrantyMonths ?? 12,
      mrp: plan.handset?.mrp ? round2(plan.handset.mrp) : null,
      notes: plan.handset?.notes ?? null,
    },
    deviceName: deviceDisplayName(plan.handset),
    imei: plan.handset?.imei,
    sellingPrice: round2(plan.sellingPrice || 0),
    downPayment: round2(plan.downPayment || 0),
    loanAmount: round2(plan.loanAmount || 0),
    tenureMonths: plan.tenureMonths,
    totalEmiMonths: plan.tenureMonths,
    monthlyInstallment: round2(plan.monthlyInstallment || 0),
    installmentAmount: round2(plan.monthlyInstallment || 0),
    paidInstallments: plan.paidInstallments || 0,
    currentEmiNumber,
    paidAmount: round2(plan.paidAmount || 0),
    outstandingAmount: round2(outstanding),
    firstEmiDueDate: plan.firstEmiDueDate,
    nextDueDate: plan.nextDueDate,
    startDate: plan.startDate,
    clearedAt: plan.clearedAt ?? null,
    status: plan.status,
    overdueDays,
    notes: plan.notes ?? null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function planToListFields(plan, now = new Date()) {
  const outstanding = Math.max(plan.loanAmount - plan.paidAmount, 0);
  const currentEmiNumber = Math.min(plan.paidInstallments + 1, plan.tenureMonths);
  const overdueDays =
    plan.status === 'OVERDUE' && plan.nextDueDate ? daysBetween(plan.nextDueDate, now) : 0;

  const statusMap = {
    OVERDUE: {
      status: 'overdue',
      statusDetail: `OVERDUE (${overdueDays} Days)`,
      installmentLabel: 'Overdue Installment',
      outstandingLabel: 'Outstanding Balance',
    },
    DUE_TODAY: {
      status: 'dueToday',
      statusDetail: 'DUE TODAY',
      installmentLabel: "Today's EMI",
      outstandingLabel: 'Pending Outstanding',
    },
    CLEARED: {
      status: 'cleared',
      statusDetail: 'PAID OFF',
      installmentLabel: 'Final Installment',
      outstandingLabel: 'Outstanding Balance',
    },
    ON_TRACK: {
      status: 'onTrack',
      statusDetail: 'ON TRACK',
      installmentLabel: 'Monthly Installment',
      outstandingLabel: 'Outstanding Balance',
    },
  };

  const meta = statusMap[plan.status] || statusMap.ON_TRACK;

  return {
    deviceName: deviceDisplayName(plan.handset),
    imei: plan.handset?.imei ?? null,
    planId: String(plan._id),
    currentEmiNumber,
    totalEmiMonths: plan.tenureMonths,
    installmentAmount: round2(plan.monthlyInstallment),
    outstandingAmount: round2(outstanding),
    paidAmount: round2(plan.paidAmount),
    nextDueDate: plan.nextDueDate,
    ...meta,
  };
}

function toListItem(customer, customerPlans = [], customerHandsets = [], now = new Date()) {
  const plansList = Array.isArray(customerPlans) ? customerPlans : customerPlans ? [customerPlans] : [];
  const handsetsList = Array.isArray(customerHandsets) ? customerHandsets : customerHandsets ? [customerHandsets] : [];
  const activePlan = plansList.find((p) => p.status !== 'CLEARED') || plansList[0] || null;
  const latestHandset = handsetsList[0] || null;
  const emiPlans = plansList.map((p) => formatEmiPlan(p, now));

  const base = {
    id: String(customer._id),
    name: customer.name,
    mobileNumber: customer.mobileNumber,
    initials: initialsOf(customer.name),
    email: customer.email ?? null,
    address: customer.address ?? null,
    emiPlans,
  };

  if (!activePlan) {
    return {
      ...base,
      status: latestHandset ? 'cashSale' : 'noPlan',
      statusDetail: latestHandset ? 'CASH SALE' : 'NO ACTIVE PLAN',
      deviceName: latestHandset ? deviceDisplayName(latestHandset) : null,
      imei: latestHandset?.imei ?? null,
      currentEmiNumber: 0,
      totalEmiMonths: 0,
      installmentLabel: 'Monthly Installment',
      installmentAmount: 0,
      outstandingLabel: 'Outstanding Balance',
      outstandingAmount: 0,
      paidAmount: 0,
    };
  }

  const fields = planToListFields(activePlan, now);
  return { ...base, ...fields };
}

/* ------------------------------------------------------------------ */
/* Queries                                                            */
/* ------------------------------------------------------------------ */

async function buildCustomerListItems(storeOid, customers, now = new Date()) {
  const ids = customers.map((c) => c._id);
  if (!ids.length) return [];

  const [plans, handsets] = await Promise.all([
    EmiPlan.find({ storeId: storeOid, customerId: { $in: ids } })
      .sort({ createdAt: -1 })
      .lean(),
    Handset.find({ storeId: storeOid, customerId: { $in: ids } })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const byCustomerPlans = new Map();
  for (const plan of plans) {
    const key = String(plan.customerId);
    if (!byCustomerPlans.has(key)) byCustomerPlans.set(key, []);
    byCustomerPlans.get(key).push(plan);
  }

  const byCustomerHandsets = new Map();
  for (const handset of handsets) {
    const key = String(handset.customerId);
    if (!byCustomerHandsets.has(key)) byCustomerHandsets.set(key, []);
    byCustomerHandsets.get(key).push(handset);
  }

  return customers.map((customer) => {
    const planList = byCustomerPlans.get(String(customer._id)) || [];
    const handsetList = byCustomerHandsets.get(String(customer._id)) || [];
    return toListItem(customer, planList, handsetList, now);
  });
}

async function listCustomers(storeId, query = {}) {
  const storeOid = toObjectId(storeId, 'storeId');
  const { page, limit, skip } = getPagination(query);
  const conditions = [{ storeId: storeOid }];

  /* --- search across name / phone / device / IMEI --- */
  const search = (query.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');

    const [matchedPlans, matchedHandsets] = await Promise.all([
      EmiPlan.find({
        storeId: storeOid,
        $or: [
          { 'handset.brand': rx },
          { 'handset.modelName': rx },
          { 'handset.variant': rx },
          { 'handset.imei': rx },
          { 'handset.serialNumber': rx },
        ],
      })
        .select('customerId')
        .lean(),
      Handset.find({
        storeId: storeOid,
        $or: [
          { brand: rx },
          { modelName: rx },
          { storageVariant: rx },
          { imei: rx },
          { color: rx },
          { notes: rx },
        ],
      })
        .select('customerId')
        .lean(),
    ]);

    const deviceCustomerIds = [
      ...matchedPlans.map((p) => p.customerId),
      ...matchedHandsets.map((h) => h.customerId),
    ];

    conditions.push({
      $or: [
        { name: rx },
        { mobileNumber: rx },
        { email: rx },
        { address: rx },
        { _id: { $in: deviceCustomerIds } },
      ],
    });
  }

  /* --- category filter --- */
  const category = query.category;
  if (category && category !== 'All') {
    const statuses = CATEGORY_STATUS_MAP[category];
    if (!statuses) throw ApiError.badRequest(`Unsupported category "${category}"`, 'INVALID_CATEGORY');

    const plans = await EmiPlan.find({ storeId: storeOid, status: { $in: statuses } })
      .select('customerId')
      .lean();

    conditions.push({ _id: { $in: plans.map((p) => p.customerId) } });
  }

  const filter = { $and: conditions };

  const [customers, totalCount] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
  ]);

  const items = await buildCustomerListItems(storeOid, customers);

  return { items, pagination: buildMeta(totalCount, page, limit) };
}

async function getCustomerProfile(storeId, customerId) {
  const storeOid = toObjectId(storeId, 'storeId');
  const cid = toObjectId(customerId, 'customerId');

  const customer = await Customer.findOne({ _id: cid, storeId: storeOid }).lean();
  if (!customer) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  const [plans, payments, handsets] = await Promise.all([
    EmiPlan.find({ storeId: storeOid, customerId: cid }).sort({ createdAt: -1 }).lean(),
    Payment.find({ storeId: storeOid, customerId: cid }).sort({ paymentDate: -1 }).lean(),
    Handset.find({ storeId: storeOid, customerId: cid }).sort({ createdAt: -1 }).lean(),
  ]);

  const activePlan = plans.find((p) => p.status !== 'CLEARED') || plans[0] || null;
  const now = new Date();

  const emiPurchases = plans.reduce((sum, p) => sum + (p.sellingPrice || 0), 0);
  const cashPurchases = handsets
    .filter((h) => h.saleType === 'CASH' || !h.emiPlanId)
    .reduce((sum, h) => sum + (h.sellingPrice || 0), 0);
  const totalPurchases = round2(emiPurchases + cashPurchases);

  const totalRecovered = round2(payments.reduce((sum, p) => sum + (p.amount || 0), 0));

  const methods = [...new Set(payments.map((p) => paymentService.methodLabel(p.paymentMethod)))];
  const recoveryMethod = methods.length ? `Via ${methods.join(' & ')}` : null;

  const overdueAmount = activePlan
    ? round2(Math.max(activePlan.loanAmount - activePlan.paidAmount, 0))
    : 0;
  const overdueDays =
    activePlan && activePlan.status === 'OVERDUE' && activePlan.nextDueDate
      ? daysBetween(activePlan.nextDueDate, now)
      : 0;

  const paymentHistory = payments.map((p) => ({
    id: String(p._id),
    label: p.paymentType === 'DOWN_PAYMENT' ? 'Initial Down Payment' : `EMI #${p.installmentNumber}`,
    method: paymentService.methodLabel(p.paymentMethod),
    methodCode: p.paymentMethod,
    date: formatDate(p.paymentDate),
    ref: paymentService.paymentReferenceLabel(p),
    receiptNumber: p.receiptNumber,
    amount: round2(p.amount),
    status: p.status.toLowerCase(),
  }));

  const emiPlans = plans.map((p) => formatEmiPlan(p, now));

  const formattedHandsets = handsets.map((h) => ({
    id: String(h._id),
    brand: h.brand,
    modelName: h.modelName,
    deviceName: deviceDisplayName(h),
    imei: h.imei,
    storageVariant: h.storageVariant ?? null,
    color: h.color ?? null,
    notes: h.notes ?? null,
    saleType: h.saleType || (h.emiPlanId ? 'EMI' : 'CASH'),
    sellingPrice: h.sellingPrice ? round2(h.sellingPrice) : null,
    emiPlanId: h.emiPlanId ? String(h.emiPlanId) : null,
    createdAt: h.createdAt,
  }));

  return {
    id: String(customer._id),
    name: customer.name,
    initials: initialsOf(customer.name),
    phone: customer.mobileNumber,
    email: customer.email ?? null,
    address: customer.address ?? null,
    aadhaarNumber: customer.aadhaarNumber ?? null,
    memberSince: formatDate(customer.createdAt).split(' ').slice(1).join(' '),
    isActive: customer.isActive,
    totalPurchases,
    deviceCount: Math.max(plans.length, handsets.length),
    totalRecovered,
    recoveryMethod,
    overdueAmount: activePlan?.status === 'OVERDUE' ? overdueAmount : 0,
    overdueDays,
    upcomingInstallment: activePlan ? round2(activePlan.monthlyInstallment) : 0,
    upcomingDate: activePlan?.nextDueDate ? formatDate(activePlan.nextDueDate) : null,
    activeLoan: activePlan
      ? {
        id: String(activePlan._id),
        brand: activePlan.handset.brand,
        model: activePlan.handset.modelName,
        storage: activePlan.handset.storage ?? null,
        color: activePlan.handset.color ?? null,
        imei: activePlan.handset?.imei ?? null,
        principal: round2(activePlan.loanAmount),
        monthlyEmi: round2(activePlan.monthlyInstallment),
        emiPaid: activePlan.paidInstallments,
        emiTotal: activePlan.tenureMonths,
        isDefaulted: activePlan.status === 'OVERDUE',
        status: activePlan.status,
      }
      : null,
    handsets: formattedHandsets,
    emiPlans,
    paymentHistory,
  };
}

async function updateCustomer(storeId, customerId, payload) {
  const storeOid = toObjectId(storeId, 'storeId');
  const cid = toObjectId(customerId, 'customerId');

  const customer = await Customer.findOne({ _id: cid, storeId: storeOid });
  if (!customer) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  if (payload.name !== undefined) customer.name = payload.name;

  if (payload.mobileNumber !== undefined) {
    const normalized = normalizeMobile(payload.mobileNumber);
    const clash = await Customer.findOne({
      storeId: storeOid,
      mobileNumberNormalized: normalized,
      _id: { $ne: customer._id },
    });
    if (clash) {
      throw ApiError.conflict('Another customer already uses this mobile number', 'CUSTOMER_EXISTS');
    }
    customer.mobileNumber = payload.mobileNumber;
    customer.mobileNumberNormalized = normalized;
  }

  if (payload.email !== undefined) customer.email = payload.email || null;
  if (payload.address !== undefined) customer.address = payload.address || null;
  if (payload.aadhaarNumber !== undefined) customer.aadhaarNumber = payload.aadhaarNumber || null;
  if (payload.isActive !== undefined) customer.isActive = payload.isActive;
  if (payload.notes !== undefined) customer.notes = payload.notes || null;

  await customer.save();

  return { id: String(customer._id), updatedAt: customer.updatedAt };
}

/* ------------------------------------------------------------------ */
/* Customer + Handset + EMI plan creation                             */
/* ------------------------------------------------------------------ */

async function createCustomerWithPlan(storeId, payload) {
  const storeOid = toObjectId(storeId, 'storeId');
  const customerInput = payload.customer || {};
  const device = payload.device || payload.handset || {};
  const emiTerms = payload.emiTerms || null;
  const isCashSale = payload.saleType === 'CASH' || !emiTerms || !emiTerms.tenureMonths;

  /* ---- customer resolution (link existing or create new) ---- */
  const customerName = (customerInput.fullName || customerInput.name || '').trim();
  if (!customerName) {
    throw ApiError.badRequest('Customer full name is required', 'INVALID_NAME');
  }

  const rawMobile = customerInput.mobileNumber || '';
  if (!rawMobile.trim()) {
    throw ApiError.badRequest('Customer mobile number is required', 'INVALID_MOBILE');
  }
  const normalized = normalizeMobile(rawMobile);

  let customer = null;
  let isNewCustomer = false;

  const passedCid = payload.customerId || customerInput.id || customerInput._id || customerInput.customerId;
  if (passedCid) {
    customer = await Customer.findOne({ _id: toObjectId(passedCid, 'customerId'), storeId: storeOid });
  }

  if (!customer) {
    customer = await Customer.findOne({
      storeId: storeOid,
      mobileNumberNormalized: normalized,
    });
  }

  if (customer) {
    // If existing customer, update any supplementary fields if provided
    let updated = false;
    if (customerInput.email && !customer.email) {
      customer.email = customerInput.email.toLowerCase().trim();
      updated = true;
    }
    if (customerInput.address && !customer.address) {
      customer.address = customerInput.address.trim();
      updated = true;
    }
    if (customerInput.aadhaarNumber && !customer.aadhaarNumber) {
      customer.aadhaarNumber = customerInput.aadhaarNumber.trim();
      updated = true;
    }
    if (customerInput.notes && !customer.notes) {
      customer.notes = customerInput.notes.trim();
      updated = true;
    }
    if (updated) {
      await customer.save();
    }
  } else {
    customer = await Customer.create({
      storeId: storeOid,
      name: customerName,
      mobileNumber: rawMobile.trim(),
      mobileNumberNormalized: normalized,
      email: customerInput.email ? customerInput.email.toLowerCase().trim() : null,
      address: customerInput.address ? customerInput.address.trim() : null,
      aadhaarNumber: customerInput.aadhaarNumber ? customerInput.aadhaarNumber.trim() : null,
      notes: customerInput.notes ? customerInput.notes.trim() : null,
    });
    isNewCustomer = true;
  }

  /* ---- device / handset fields ---- */
  const brand = (device.brand || '').trim();
  const modelName = (device.modelName || '').trim();
  const imei = (device.imei || device.imeiNumber || '').trim() || null;
  const storageVariant = (
    device.storageVariant ||
    [device.storage, device.variant].filter(Boolean).join(' / ') ||
    ''
  ).trim() || null;
  const color = device.color ? device.color.trim() : null;
  const notes = device.notes ? device.notes.trim() : null;

  let handset = null;

  try {
    if (isCashSale) {
      /* ---- CASH sale only: save handset without EMI plan ---- */
      const cashSellingPrice =
        device.sellingPrice !== undefined
          ? round2(device.sellingPrice)
          : emiTerms?.sellingPrice !== undefined
          ? round2(emiTerms.sellingPrice)
          : null;

      handset = await Handset.create({
        storeId: storeOid,
        customerId: customer._id,
        emiPlanId: null,
        saleType: 'CASH',
        brand,
        modelName,
        imei,
        storageVariant,
        color,
        notes,
        variant: device.variant || null,
        storage: device.storage || null,
        serialNumber: device.serialNumber || null,
        warrantyMonths: device.warrantyMonths ?? 12,
        mrp: device.mrp ?? null,
        sellingPrice: cashSellingPrice,
      });

      return {
        customerId: String(customer._id),
        handsetId: String(handset._id),
        emiPlanId: null,
        saleType: 'CASH',
        isExistingCustomer: !isNewCustomer,
        createdAt: handset.createdAt,
      };
    }

    /* ---- EMI sale: validate terms and create plan ---- */
    const sellingPrice = round2(emiTerms.sellingPrice);
    const downPayment = round2(emiTerms.downPayment ?? 0);

    if (downPayment > sellingPrice) {
      throw ApiError.badRequest('Down payment cannot exceed the selling price', 'INVALID_DOWN_PAYMENT');
    }

    const computedLoan = round2(sellingPrice - downPayment);
    const loanAmount = emiTerms.loanAmount !== undefined ? round2(emiTerms.loanAmount) : computedLoan;

    if (Math.abs(loanAmount - computedLoan) > 1) {
      throw ApiError.badRequest(
        'loanAmount must equal sellingPrice - downPayment',
        'INVALID_LOAN_AMOUNT'
      );
    }

    const tenureMonths = emiTerms.tenureMonths;
    const monthlyInstallment = round2(
      emiTerms.monthlyInstallment ?? computedLoan / tenureMonths
    );
    const firstEmiDueDate = new Date(emiTerms.firstEmiDueDate);

    /* ---- create Handset document ---- */
    handset = await Handset.create({
      storeId: storeOid,
      customerId: customer._id,
      saleType: 'EMI',
      brand,
      modelName,
      imei,
      storageVariant,
      color,
      notes,
      variant: device.variant || null,
      storage: device.storage || null,
      serialNumber: device.serialNumber || null,
      warrantyMonths: device.warrantyMonths ?? 12,
      mrp: device.mrp ?? null,
      sellingPrice,
    });

    /* ---- create EMI plan ---- */
    const plan = await EmiPlan.create({
      storeId: storeOid,
      customerId: customer._id,
      handsetId: handset._id,
      handset: {
        brand,
        modelName,
        variant: device.variant || storageVariant || null,
        storage: device.storage || storageVariant || null,
        color,
        imei,
        serialNumber: device.serialNumber || null,
        warrantyMonths: device.warrantyMonths ?? 12,
        mrp: device.mrp ?? null,
        notes,
      },
      sellingPrice,
      downPayment,
      loanAmount,
      tenureMonths,
      monthlyInstallment,
      paidInstallments: 0,
      paidAmount: 0,
      firstEmiDueDate,
      nextDueDate: firstEmiDueDate,
      startDate: new Date(),
      status: computeEmiStatus({ paidInstallments: 0, tenureMonths, nextDueDate: firstEmiDueDate }),
      notes: emiTerms.notes || null,
    });

    handset.emiPlanId = plan._id;
    await handset.save();

    /* ---- record the down payment (if any) ---- */
    if (downPayment > 0) {
      await paymentService.createPaymentDoc({
        storeId: storeOid,
        customer,
        plan,
        amount: downPayment,
        paymentMethod: emiTerms.downPaymentMethod || 'CASH',
        paymentType: 'DOWN_PAYMENT',
        paymentDate: new Date(),
        transactionReference: emiTerms.downPaymentReference || null,
        notes: 'Initial down payment collected at onboarding',
        status: 'SETTLED',
      });
    }

    return {
      customerId: String(customer._id),
      handsetId: String(handset._id),
      emiPlanId: String(plan._id),
      saleType: 'EMI',
      isExistingCustomer: !isNewCustomer,
      createdAt: plan.createdAt,
    };
  } catch (err) {
    // Roll back the newly created customer & handset if this request failed.
    // Do NOT delete existing customer or existing customer's older handsets!
    if (isNewCustomer && customer?._id) {
      await Customer.deleteOne({ _id: customer._id }).catch(() => { });
    }
    if (handset?._id) {
      await Handset.deleteOne({ _id: handset._id }).catch(() => { });
    }
    throw err;
  }
}

module.exports = {
  listCustomers,
  getCustomerProfile,
  createCustomerWithPlan,
  saveCustomer: createCustomerWithPlan,
  updateCustomer,
  buildCustomerListItems,
  toListItem,
  planToListFields,
};