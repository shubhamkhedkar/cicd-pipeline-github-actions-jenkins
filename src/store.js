'use strict';

const crypto = require('node:crypto');

// In-memory store. Swap for a database adapter in a real environment.
function createStore() {
  const orders = new Map();
  return {
    create(data) {
      const order = { id: crypto.randomUUID(), status: 'CREATED', createdAt: new Date().toISOString(), ...data };
      orders.set(order.id, order);
      return order;
    },
    get: (id) => orders.get(id) || null,
    list: () => [...orders.values()],
    updateStatus(id, status) {
      const order = orders.get(id);
      if (!order) return null;
      order.status = status;
      return order;
    },
    clear: () => orders.clear(),
  };
}

module.exports = { createStore };
