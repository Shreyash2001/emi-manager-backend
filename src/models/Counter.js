'use strict';

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  { _id: { type: String }, seq: { type: Number, default: 0 } },
  { versionKey: false }
);

/** Atomically increments and returns the next sequence for a named counter. */
counterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);