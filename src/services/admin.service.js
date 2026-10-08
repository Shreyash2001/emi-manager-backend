'use strict';

const ApiError = require('../utils/ApiError');
const { toObjectId } = require('../utils/objectId');
const { getPagination, buildMeta } = require('../utils/pagination');
const { escapeRegex, normalizeMobile } = require('../utils/string');
const { round2 } = require('../utils/emi');

const Store = require('../models/Store');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');

async function getDashboard() {
  const [totalStores, activeStores, suspendedStores, totalPlatformCustomers, collectionAgg] =
    await Promise.all([
      Store.countDocuments({}),
      Store.countDocuments({ status: 'ACTIVE' }),
      Store.countDocuments({ status: 'SUSPENDED' }),
      Customer.countDocuments({}),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

  return {
    totalStores,
    activeStores,
    suspendedStores,
    totalPlatformCustomers,
    totalPlatformCollection: round2(collectionAgg[0]?.total || 0),
  };
}

async function listStores(query = {}) {
  const { page, limit, skip } = getPagination(query);

  const filter = {};
  const search = (query.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { ownerName: rx }, { mobileNumber: rx }, { email: rx }];
  }
  if (query.status && ['ACTIVE', 'SUSPENDED'].includes(query.status)) {
    filter.status = query.status;
  }

  const [stores, totalCount] = await Promise.all([
    Store.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Store.countDocuments(filter),
  ]);

  const ids = stores.map((s) => s._id);

  const [customerCounts, collectionSums, owners] = await Promise.all([
    Customer.aggregate([
      { $match: { storeId: { $in: ids } } },
      { $group: { _id: '$storeId', count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { storeId: { $in: ids } } },
      { $group: { _id: '$storeId', total: { $sum: '$amount' } } },
    ]),
    User.find({ storeId: { $in: ids }, role: 'STORE_OWNER' })
      .select('storeId name mobileNumber email isActive lastLoginAt')
      .lean(),
  ]);

  const customerMap = new Map(customerCounts.map((c) => [String(c._id), c.count]));
  const collectionMap = new Map(collectionSums.map((c) => [String(c._id), c.total]));
  const ownerMap = new Map(owners.map((o) => [String(o.storeId), o]));

  const items = stores.map((s) => {
    const owner = ownerMap.get(String(s._id));
    return {
      id: String(s._id),
      name: s.name,
      ownerName: s.ownerName,
      ownerUserId: owner ? String(owner._id) : null,
      mobileNumber: s.mobileNumber,
      email: s.email ?? null,
      address: s.address ?? null,
      status: s.status,
      statusReason: s.statusReason ?? null,
      theme: s.theme,
      totalCustomers: customerMap.get(String(s._id)) || 0,
      totalCollection: round2(collectionMap.get(String(s._id)) || 0),
      ownerLastLoginAt: owner?.lastLoginAt ?? null,
      createdAt: s.createdAt,
    };
  });

  return { items, pagination: buildMeta(totalCount, page, limit) };
}

async function createStore(payload) {
  const mobile = normalizeMobile(payload.mobileNumber);

  const existingUser = await User.findOne({ mobileNumber: mobile });
  if (existingUser) {
    throw ApiError.conflict('A user with this mobile number already exists', 'MOBILE_ALREADY_EXISTS');
  }

  const store = await Store.create({
    name: payload.storeName,
    ownerName: payload.ownerName,
    mobileNumber: mobile,
    email: payload.email || null,
    address: payload.address || null,
    status: 'ACTIVE',
  });

  try {
    const owner = await User.create({
      storeId: store._id,
      name: payload.ownerName,
      mobileNumber: mobile,
      password: payload.password,
      role: 'STORE_OWNER',
    });

    return {
      storeId: String(store._id),
      ownerUserId: String(owner._id),
      createdAt: store.createdAt,
    };
  } catch (err) {
    await Store.deleteOne({ _id: store._id }).catch(() => { });
    throw err;
  }
}

async function updateStoreStatus(storeId, { status, reason }) {
  const sid = toObjectId(storeId, 'storeId');

  const store = await Store.findById(sid);
  if (!store) throw ApiError.notFound('Store not found', 'STORE_NOT_FOUND');

  store.status = status;
  store.statusReason = status === 'SUSPENDED' ? reason || null : null;
  await store.save();

  // Suspended stores lock out their users immediately.
  if (status === 'SUSPENDED') {
    await User.updateMany({ storeId: sid }, { $set: { isActive: false } });
  } else {
    await User.updateMany({ storeId: sid, role: 'STORE_OWNER' }, { $set: { isActive: true } });
  }

  return { storeId: String(store._id), status: store.status, reason: store.statusReason };
}

async function resetStoreOwnerPassword(storeId, { newPassword }) {
  const sid = toObjectId(storeId, 'storeId');

  const owner = await User.findOne({ storeId: sid, role: 'STORE_OWNER' }).select('+password');
  if (!owner) throw ApiError.notFound('Store owner account not found', 'STORE_OWNER_NOT_FOUND');

  owner.password = newPassword; // hashed by the User model pre-save hook
  await owner.save();

  return null;
}

async function updateStoreTheme(storeId, theme) {
  const sid = toObjectId(storeId, 'storeId');

  const store = await Store.findById(sid);
  if (!store) throw ApiError.notFound('Store not found', 'STORE_NOT_FOUND');

  const allowed = ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'logoUrl'];
  allowed.forEach((key) => {
    if (theme[key] !== undefined) store.theme[key] = theme[key] || null;
  });

  await store.save();

  return store.themeJSON();
}

async function updateStore(storeId, payload) {
  const sid = toObjectId(storeId, 'storeId');
  const store = await Store.findById(sid);
  if (!store) throw ApiError.notFound('Store not found', 'STORE_NOT_FOUND');

  const owner = await User.findOne({ storeId: sid, role: 'STORE_OWNER' }).select('+password');
  if (payload.mobileNumber !== undefined) {
    console.log('payload.mobileNumber', payload.mobileNumber);
    const mobile = normalizeMobile(payload.mobileNumber);
    console.log('mobile', mobile);
    let existingUser;
    try {
      existingUser = await User.findOne({ mobileNumber: mobile, storeId: { $ne: sid } });
      console.log('existingUser', existingUser);
    } catch (error) {
      console.log(error);
    }
    if (existingUser) {
      throw ApiError.conflict('A user with this mobile number already exists', 'MOBILE_ALREADY_EXISTS');
    }
    store.mobileNumber = mobile;
    if (owner) owner.mobileNumber = mobile;
  }

  if (payload.storeName !== undefined) store.name = payload.storeName;
  if (payload.ownerName !== undefined) {
    store.ownerName = payload.ownerName;
    if (owner) owner.name = payload.ownerName;
  }
  if (payload.email !== undefined) store.email = payload.email || null;
  if (payload.address !== undefined) store.address = payload.address || null;
  if (payload.password && owner) owner.password = payload.password;

  await store.save();
  if (owner) await owner.save();

  return {
    id: String(store._id),
    name: store.name,
    ownerName: store.ownerName,
    mobileNumber: store.mobileNumber,
    email: store.email,
    address: store.address,
    status: store.status,
    updatedAt: store.updatedAt,
  };
}

module.exports = {
  getDashboard,
  listStores,
  createStore,
  updateStore,
  updateStoreStatus,
  resetStoreOwnerPassword,
  updateStoreTheme,
};