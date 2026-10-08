'use strict';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Adds N calendar months preserving day-of-month (clamped to month length). */
function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const daysInTarget = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInTarget));
  return d;
}

function daysBetween(from, to) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.max(Math.floor((b - a) / 86400000), 0);
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/**
 * Derives EMI plan status from paid installments + next due date.
 * @returns {'ON_TRACK'|'DUE_TODAY'|'OVERDUE'|'CLEARED'}
 */
function computeEmiStatus({ paidInstallments = 0, tenureMonths = 1, nextDueDate = null }, now = new Date()) {
  if (paidInstallments >= tenureMonths) return 'CLEARED';
  if (!nextDueDate) return 'ON_TRACK';

  const today = startOfDay(now).getTime();
  const due = startOfDay(nextDueDate).getTime();
  if (due < today) return 'OVERDUE';
  if (due === today) return 'DUE_TODAY';
  return 'ON_TRACK';
}

function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatMonthYear(date) {
  const d = new Date(date);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

module.exports = {
  round2,
  startOfDay,
  addMonths,
  daysBetween,
  isSameDay,
  computeEmiStatus,
  formatDate,
  formatMonthYear,
  MONTHS_SHORT,
};