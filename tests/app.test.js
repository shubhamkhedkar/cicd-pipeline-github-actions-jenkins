'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

let server;
let base;

test.before(async () => {
  server = createApp({ version: '1.2.3' }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((r) => server.close(r)));

const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('GET /healthz and /readyz return ok', async () => {
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
  assert.deepEqual(await (await fetch(`${base}/readyz`)).json(), { status: 'ready' });
});

test('GET /version returns injected version', async () => {
  assert.deepEqual(await (await fetch(`${base}/version`)).json(), { version: '1.2.3' });
});

test('POST /api/orders creates an order with totals', async () => {
  const res = await post('/api/orders', { customer: 'Acme', items: [{ sku: 'X1', quantity: 2, unitPrice: 50 }] });
  assert.equal(res.status, 201);
  const order = await res.json();
  assert.equal(order.status, 'CREATED');
  assert.equal(order.total, 118);
  assert.ok(order.id);
  const fetched = await fetch(`${base}/api/orders/${order.id}`);
  assert.equal(fetched.status, 200);
});

test('POST /api/orders validates input', async () => {
  assert.equal((await post('/api/orders', { items: [] })).status, 400);
  assert.equal((await post('/api/orders', { customer: 'A', items: [] })).status, 400);
  const bad = await post('/api/orders', { customer: 'A', items: [{ sku: 'X', quantity: 1, unitPrice: 1 }], discountPercent: 500 });
  assert.equal(bad.status, 400);
});

test('invalid JSON returns 400', async () => {
  const res = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
});

test('PATCH status updates and validates', async () => {
  const order = await (await post('/api/orders', { customer: 'B', items: [{ sku: 'Y', quantity: 1, unitPrice: 10 }] })).json();
  const patch = (id, status) =>
    fetch(`${base}/api/orders/${id}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
  assert.equal((await patch(order.id, 'PAID')).status, 200);
  assert.equal((await patch(order.id, 'LOST')).status, 400);
  assert.equal((await patch('missing', 'PAID')).status, 404);
});

test('unknown routes and orders return 404', async () => {
  assert.equal((await fetch(`${base}/nope`)).status, 404);
  assert.equal((await fetch(`${base}/api/orders/does-not-exist`)).status, 404);
});
