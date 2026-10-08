'use strict';

const mongoose = require('mongoose');
const config = require('../config/env');

const themeSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: config.DEFAULT_THEME.primaryColor, trim: true },
    secondaryColor: { type: String, default: config.DEFAULT_THEME.secondaryColor, trim: true },
    accentColor: { type: String, default: config.DEFAULT_THEME.accentColor, trim: true },
    backgroundColor: { type: String, default: config.DEFAULT_THEME.backgroundColor, trim: true },
    logoUrl: { type: String, default: null },
  },
  { _id: false }
);

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Store name is required'], trim: true },
    ownerName: { type: String, required: [true, 'Owner name is required'], trim: true },
    mobileNumber: { type: String, required: [true, 'Store mobile number is required'], trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    address: { type: String, default: null, trim: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
    statusReason: { type: String, default: null },
    theme: { type: themeSchema, default: () => ({}) },
  },
  { timestamps: true }
);

storeSchema.methods.themeJSON = function themeJSON() {
  return {
    primaryColor: this.theme?.primaryColor ?? config.DEFAULT_THEME.primaryColor,
    secondaryColor: this.theme?.secondaryColor ?? config.DEFAULT_THEME.secondaryColor,
    accentColor: this.theme?.accentColor ?? config.DEFAULT_THEME.accentColor,
    backgroundColor: this.theme?.backgroundColor ?? config.DEFAULT_THEME.backgroundColor,
    logoUrl: this.theme?.logoUrl ?? null,
  };
};

module.exports = mongoose.model('Store', storeSchema);