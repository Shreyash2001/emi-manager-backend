'use strict';

/** Converts "+91 98231 44521" / "9823144521" → "9823144521" (last 10 digits). */
function normalizeMobile(input) {
  if (input === null || input === undefined) return input;
  let v = String(input).replace(/[^\d+]/g, '');
  if (v.startsWith('+')) v = v.slice(1);
  if (v.length === 12 && v.startsWith('91')) v = v.slice(2);
  if (v.length === 11 && v.startsWith('0')) v = v.slice(1);
  return v;
}

function escapeRegex(input = '') {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "Amit Verma" → "AV" */
function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avoids "Samsung Samsung Galaxy S24". */
function deviceDisplayName(handset = {}) {
  const brand = (handset.brand || '').trim();
  const model = (handset.modelName || '').trim();
  if (!brand) return model;
  if (model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return `${brand} ${model}`.trim();
}

module.exports = { normalizeMobile, escapeRegex, initialsOf, deviceDisplayName };