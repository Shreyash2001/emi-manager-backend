'use strict';

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    emiPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmiPlan', required: true, index: true },

    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'UPI_AUTOPAY', 'CARD'],
      required: true,
    },
    paymentType: { type: String, enum: ['EMI', 'DOWN_PAYMENT'], default: 'EMI' },

    installmentNumber: { type: Number, default: null },
    paymentDate: { type: Date, default: Date.now, index: true },
    transactionReference: { type: String, default: null, trim: true },
    receiptNumber: { type: String, required: true, unique: true, index: true },
    notes: { type: String, default: null },
    status: { type: String, enum: ['PAID', 'SETTLED'], default: 'PAID' },

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ storeId: 1, paymentDate: -1 });
paymentSchema.index({ storeId: 1, customerId: 1, paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);