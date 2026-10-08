'use strict';

const mongoose = require('mongoose');

const handsetSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    emiPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmiPlan', default: null, index: true },
    saleType: {
      type: String,
      enum: ['CASH', 'EMI'],
      default: 'CASH',
      index: true,
    },

    brand: { type: String, required: [true, 'Brand is required'], trim: true },
    modelName: { type: String, required: [true, 'Model name is required'], trim: true },
    imei: { type: String, default: null, trim: true },
    storageVariant: { type: String, default: null, trim: true },
    color: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },

    variant: { type: String, default: null, trim: true },
    storage: { type: String, default: null, trim: true },
    serialNumber: { type: String, default: null, trim: true },
    warrantyMonths: { type: Number, default: 12 },
    mrp: { type: Number, default: null },
    sellingPrice: { type: Number, default: null },
  },
  { timestamps: true }
);

handsetSchema.index({ storeId: 1, imei: 1 }, { sparse: true });
handsetSchema.index({ storeId: 1, customerId: 1 });
handsetSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('Handset', handsetSchema);
