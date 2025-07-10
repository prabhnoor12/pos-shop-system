
// Square Integration for seamless payments
import fetch from 'node-fetch';

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_API_BASE = process.env.SQUARE_API_BASE || 'https://connect.squareupsandbox.com';
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

// Create a Square payment
export async function createSquarePayment({ amount, currency = 'USD', sourceId, note = '' }) {
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) throw new Error('Square credentials not set');
  if (!sourceId) throw new Error('Missing sourceId (nonce) from Square payment form');
  const body = {
    idempotency_key: `${Date.now()}-${Math.random()}`,
    amount_money: {
      amount: Math.round(Number(amount) * 100), // Square expects cents
      currency,
    },
    source_id: sourceId,
    location_id: SQUARE_LOCATION_ID,
    note,
  };
  const res = await fetch(`${SQUARE_API_BASE}/v2/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Square payment: ${err}`);
  }
  return await res.json();
}

// Usage example (in your route/controller):
// import { createSquarePayment } from './squareIntegration.js';
// const result = await createSquarePayment({ amount: '10.00', currency: 'USD', sourceId: 'cnon:card-nonce-ok' });
