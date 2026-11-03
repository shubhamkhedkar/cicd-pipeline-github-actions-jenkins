'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateItems, calculateTotals } = require('../src/pricing');

test('validateItems rejects empty or non-array input', () => {
  assert.match(validateItems([]), /non-empty/);
  assert.match(validateItems(undefined), /non-empty/);
});

test('validateItems checks sku, quantity and unitPrice', () => {
  assert.match(validateItems([{ quantity: 1, unitPrice: 1 }]), /sku/);
  assert.match(validateItems([{ sku: 'A', quantity: 0, unitPrice: 1 }]), /quantity/);
  assert.match(validateItems([{ sku: 'A', quantity: 1.5, unitPrice: 1 }]), /quantity/);
  assert.match(validateItems([{ sku: 'A', quantity: 1, unitPrice: -2 }]), /unitPrice/);
  assert.equal(validateItems([{ sku: 'A', quantity: 2, unitPrice: 9.99 }]), null);
});

test('calculateTotals applies 18% tax', () => {
  const t = calculateTotals([{ sku: 'A', quantity: 2, unitPrice: 50 }]);
  assert.deepEqual(t, { subtotal: 100, discount: 0, tax: 18, total: 118 });
});

test('calculateTotals applies discount before tax', () => {
  const t = calculateTotals([{ sku: 'A', quantity: 1, unitPrice: 200 }], 10);
  assert.deepEqual(t, { subtotal: 200, discount: 20, tax: 32.4, total: 212.4 });
});

test('calculateTotals rounds to two decimals', () => {
  const t = calculateTotals([{ sku: 'A', quantity: 3, unitPrice: 0.1 }]);
  assert.equal(t.subtotal, 0.3);
  assert.equal(t.total, 0.35);
});

test('calculateTotals rejects invalid discount', () => {
  assert.throws(() => calculateTotals([{ sku: 'A', quantity: 1, unitPrice: 1 }], 120), RangeError);
  assert.throws(() => calculateTotals([{ sku: 'A', quantity: 1, unitPrice: 1 }], -1), RangeError);
});
