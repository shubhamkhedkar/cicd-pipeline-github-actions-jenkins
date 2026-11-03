'use strict';

const TAX_RATE = 0.18; // GST

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'items must be a non-empty array';
  }
  for (const [i, item] of items.entries()) {
    if (!item || typeof item.sku !== 'string' || item.sku.trim() === '') {
      return `items[${i}].sku is required`;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return `items[${i}].quantity must be a positive integer`;
    }
    if (typeof item.unitPrice !== 'number' || !(item.unitPrice >= 0)) {
      return `items[${i}].unitPrice must be a non-negative number`;
    }
  }
  return null;
}

const round2 = (n) => Math.round(n * 100) / 100;

function calculateTotals(items, discountPercent = 0) {
  if (typeof discountPercent !== 'number' || discountPercent < 0 || discountPercent > 100) {
    throw new RangeError('discountPercent must be between 0 and 100');
  }
  const subtotal = round2(items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0));
  const discount = round2(subtotal * (discountPercent / 100));
  const taxable = subtotal - discount;
  const tax = round2(taxable * TAX_RATE);
  const total = round2(taxable + tax);
  return { subtotal, discount, tax, total };
}

module.exports = { validateItems, calculateTotals, TAX_RATE };
