'use strict';

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: [true, 'Customer name is required'], trim: true },
    mobileNumber: { type: String, required: [true, 'Customer mobile number is required'], trim: true },
    mobileNumberNormalized: { type: String, required: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    address: { type: String, default: null, trim: true },
    aadhaarNumber: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

// A customer is unique per store by mobile number.
customerSchema.index({ storeId: 1, mobileNumberNormalized: 1 }, { unique: true });
customerSchema.index({ storeId: 1, name: 1 });
customerSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);