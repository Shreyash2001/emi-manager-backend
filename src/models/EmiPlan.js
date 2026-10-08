'use strict';

const mongoose = require('mongoose');

const handsetSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, trim: true },
    modelName: { type: String, required: true, trim: true },
    variant: { type: String, default: null, trim: true },
    storage: { type: String, default: null, trim: true },
    color: { type: String, default: null, trim: true },
    imei: { type: String, default: null, trim: true },
    serialNumber: { type: String, default: null, trim: true },
    warrantyMonths: { type: Number, default: 12 },
    mrp: { type: Number, default: null },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const emiPlanSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    handsetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Handset', default: null, index: true },

    handset: { type: handsetSchema, required: true },

    sellingPrice: { type: Number, required: true, min: 0 },
    downPayment: { type: Number, default: 0, min: 0 },
    loanAmount: { type: Number, required: true, min: 0 },

    tenureMonths: { type: Number, required: true, min: 1, max: 120 },
    monthlyInstallment: { type: Number, required: true, min: 0 },

    paidInstallments: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },

    firstEmiDueDate: { type: Date, required: true },
    nextDueDate: { type: Date, default: null },
    startDate: { type: Date, default: Date.now },
    clearedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ['ON_TRACK', 'DUE_TODAY', 'OVERDUE', 'CLEARED'],
      default: 'ON_TRACK',
      index: true,
    },
    notes: { type: String, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

emiPlanSchema.virtual('remainingInstallments').get(function remaining() {
  return Math.max(this.tenureMonths - this.paidInstallments, 0);
});

emiPlanSchema.virtual('outstandingAmount').get(function outstanding() {
  return Math.max(this.loanAmount - this.paidAmount, 0);
});

emiPlanSchema.index({ storeId: 1, status: 1 });
emiPlanSchema.index({ storeId: 1, customerId: 1 });
emiPlanSchema.index({ storeId: 1, nextDueDate: 1 });
emiPlanSchema.index({ storeId: 1, 'handset.imei': 1 }, { sparse: true });

module.exports = mongoose.model('EmiPlan', emiPlanSchema);