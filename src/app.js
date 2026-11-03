'use strict';

const express = require('express');
const { validateItems, calculateTotals } = require('./pricing');
const { createStore } = require('./store');

const VALID_STATUSES = ['CREATED', 'PAID', 'SHIPPED', 'CANCELLED'];

function createApp({ store = createStore(), version = process.env.APP_VERSION || 'dev' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/readyz', (_req, res) => res.json({ status: 'ready' }));
  app.get('/version', (_req, res) => res.json({ version }));

  app.get('/api/orders', (_req, res) => res.json(store.list()));

  app.get('/api/orders/:id', (req, res) => {
    const order = store.get(req.params.id);
    if (!order) return res.status(404).json({ error: 'order not found' });
    return res.json(order);
  });

  app.post('/api/orders', (req, res) => {
    const { customer, items, discountPercent = 0 } = req.body || {};
    if (typeof customer !== 'string' || customer.trim() === '') {
      return res.status(400).json({ error: 'customer is required' });
    }
    const itemError = validateItems(items);
    if (itemError) return res.status(400).json({ error: itemError });
    let totals;
    try {
      totals = calculateTotals(items, discountPercent);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    const order = store.create({ customer: customer.trim(), items, discountPercent, ...totals });
    return res.status(201).json(order);
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }
    const order = store.updateStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: 'order not found' });
    return res.json(order);
  });

  app.use((_req, res) => res.status(404).json({ error: 'not found' }));
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON body' });
    return res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp, VALID_STATUSES };
