'use strict';

/**
 * Seeds a SUPER_ADMIN, a demo store + owner, customers, EMI plans and payments.
 * Usage:  npm run seed
 */

require('dotenv').config();

const mongoose = require('mongoose');
const config = require('../src/config/env');
const { addMonths, round2 } = require('../src/utils/emi');
const { normalizeMobile } = require('../src/utils/string');

const Store = require('../src/models/Store');
const User = require('../src/models/User');
const Customer = require('../src/models/Customer');
const Handset = require('../src/models/Handset');
const EmiPlan = require('../src/models/EmiPlan');
const Payment = require('../src/models/Payment');
const Counter = require('../src/models/Counter');

async function run() {
  await mongoose.connect(config.MONGO_URI);
  console.log('🔌 Connected to', config.MONGO_URI);

  // Wipe collections
  await Promise.all([
    Store.deleteMany({}),
    User.deleteMany({}),
    Customer.deleteMany({}),
    Handset.deleteMany({}),
    EmiPlan.deleteMany({}),
    Payment.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  console.log('🧹 Cleared existing data');

  /* ---------------------- Super admin ---------------------- */
  await User.create({
    name: 'Platform Super Admin',
    mobileNumber: '9000000000',
    password: 'superadmin123',
    role: 'SUPER_ADMIN',
    storeId: null,
  });

  /* ---------------------- Demo store ----------------------- */
  const store = await Store.create({
    name: 'Shree Ganesh Mobiles',
    ownerName: 'Rajesh Ji',
    mobileNumber: '9823011223',
    email: 'ganesh.mobiles@example.com',
    address: 'Ganesh Nagar, Pune',
    status: 'ACTIVE',
    theme: {
      primaryColor: '#6C5CE7',
      secondaryColor: '#111827',
      accentColor: '#F59E0B',
      backgroundColor: '#F8FAFC',
      logoUrl: null,
    },
  });

  await User.create({
    storeId: store._id,
    name: 'Demo Store Owner',
    mobileNumber: '1234567890',
    password: '12345',
    role: 'STORE_OWNER',
  });

  /* ---------------------- Customers ------------------------ */
  const customerSeeds = [
    {
      name: 'Amit Verma',
      mobileNumber: '+91 98231 44521',
      email: 'amit.verma@example.com',
      address: 'Kothrud, Pune',
      device: {
        brand: 'Samsung',
        modelName: 'Samsung Galaxy S23 5G',
        variant: '256GB / Phantom Black',
        storage: '256GB',
        color: 'Phantom Black',
        imei: '358921094831034',
        serialNumber: 'RSCW10X99M',
      },
      sellingPrice: 53999,
      downPayment: 14999,
      tenureMonths: 12,
      monthlyInstallment: 3250,
      paidInstallments: 4,
    },
    {
      name: 'Priya Sharma',
      mobileNumber: '+91 97652 11094',
      email: null,
      address: 'MG Road, Pune',
      device: {
        brand: 'OnePlus',
        modelName: 'OnePlus Nord CE 3',
        variant: '128GB / Aqua Surge',
        storage: '128GB',
        color: 'Aqua Surge',
        imei: '861049281729104',
        serialNumber: 'OPNC3X8811',
      },
      sellingPrice: 24999,
      downPayment: 3999,
      tenureMonths: 6,
      monthlyInstallment: 3500,
      paidInstallments: 1,
    },
    {
      name: 'Neha Kulkarni',
      mobileNumber: '+91 90112 33445',
      email: 'neha.k@example.com',
      address: 'Baner, Pune',
      device: {
        brand: 'Apple',
        modelName: 'iPhone 15',
        variant: '128GB / Blue',
        storage: '128GB',
        color: 'Blue',
        imei: '351234567890123',
        serialNumber: 'APL15X0001',
      },
      sellingPrice: 69900,
      downPayment: 20000,
      tenureMonths: 12,
      monthlyInstallment: 4158.33,
      paidInstallments: 12,
    },
  ];

  for (const seed of customerSeeds) {
    const loanAmount = round2(seed.sellingPrice - seed.downPayment);
    const firstEmiDueDate = addMonths(new Date(), -(seed.paidInstallments) - 1);

    const customer = await Customer.create({
      storeId: store._id,
      name: seed.name,
      mobileNumber: seed.mobileNumber,
      mobileNumberNormalized: normalizeMobile(seed.mobileNumber),
      email: seed.email,
      address: seed.address,
    });

    const cleared = seed.paidInstallments >= seed.tenureMonths;
    const paidAmount = round2(seed.monthlyInstallment * seed.paidInstallments);

    const handset = await Handset.create({
      storeId: store._id,
      customerId: customer._id,
      saleType: 'EMI',
      brand: seed.device.brand,
      modelName: seed.device.modelName,
      imei: seed.device.imei,
      storageVariant: seed.device.variant || seed.device.storage,
      color: seed.device.color,
      notes: null,
      variant: seed.device.variant,
      storage: seed.device.storage,
      serialNumber: seed.device.serialNumber,
      sellingPrice: seed.sellingPrice,
    });

    const plan = await EmiPlan.create({
      storeId: store._id,
      customerId: customer._id,
      handsetId: handset._id,
      handset: seed.device,
      sellingPrice: seed.sellingPrice,
      downPayment: seed.downPayment,
      loanAmount,
      tenureMonths: seed.tenureMonths,
      monthlyInstallment: seed.monthlyInstallment,
      paidInstallments: seed.paidInstallments,
      paidAmount,
      firstEmiDueDate,
      nextDueDate: cleared ? null : addMonths(firstEmiDueDate, seed.paidInstallments),
      startDate: addMonths(firstEmiDueDate, -1),
      status: cleared ? 'CLEARED' : 'ON_TRACK',
      clearedAt: cleared ? new Date() : null,
    });

    handset.emiPlanId = plan._id;
    await handset.save();

    // Down payment record
    if (seed.downPayment > 0) {
      const seq = await Counter.next('receipt');
      await Payment.create({
        storeId: store._id,
        customerId: customer._id,
        emiPlanId: plan._id,
        amount: seed.downPayment,
        paymentMethod: 'CARD',
        paymentType: 'DOWN_PAYMENT',
        installmentNumber: null,
        paymentDate: addMonths(firstEmiDueDate, -1),
        receiptNumber: `REC-${String(seq).padStart(4, '0')}`,
        status: 'SETTLED',
        notes: 'Initial down payment',
      });
    }

    // EMI records
    for (let i = 1; i <= seed.paidInstallments; i += 1) {
      const seq = await Counter.next('receipt');
      await Payment.create({
        storeId: store._id,
        customerId: customer._id,
        emiPlanId: plan._id,
        amount: seed.monthlyInstallment,
        paymentMethod: i % 3 === 0 ? 'UPI' : i % 3 === 1 ? 'CASH' : 'UPI_AUTOPAY',
        paymentType: 'EMI',
        installmentNumber: i,
        paymentDate: addMonths(firstEmiDueDate, i - 1),
        receiptNumber: `REC-${String(seq).padStart(4, '0')}`,
        status: 'PAID',
        notes: `EMI #${i} collected`,
      });
    }
  }

  console.log('✅ Seed complete');
  console.log('   SUPER_ADMIN  → 9000000000 / superadmin123');
  console.log('   STORE_OWNER  → 1234567890 / 12345');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});