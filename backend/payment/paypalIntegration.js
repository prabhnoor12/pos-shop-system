
// PayPal Integration for seamless payments

// Use native fetch if available (Node 18+), fallback to node-fetch
let fetchFn;
try {
  fetchFn = globalThis.fetch ? globalThis.fetch.bind(globalThis) : undefined;
} catch {
  fetchFn = undefined;
}
if (!fetchFn) {
  fetchFn = (await import('node-fetch')).default;
}


const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

// Get OAuth2 access token from PayPal (with in-memory caching for efficiency)
let cachedToken = null;
let cachedTokenExpires = 0;
export async function getPayPalAccessToken() {
  const now = Date.now();
  if (cachedToken && cachedTokenExpires > now + 60000) {
    return cachedToken;
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetchFn(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('Failed to get PayPal access token');
  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpires = now + (data.expires_in ? data.expires_in * 1000 : 300000);
  return cachedToken;
}

// Create a PayPal order
export async function createPayPalOrder({ amount, currency = 'USD', description = '' }) {
  const accessToken = await getPayPalAccessToken();
  const res = await fetchFn(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
          },
          description,
        },
      ],
      application_context: {
        brand_name: process.env.PAYPAL_BRAND_NAME || 'POS Shop System',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: process.env.PAYPAL_RETURN_URL || 'https://yourdomain.com/paypal/success',
        cancel_url: process.env.PAYPAL_CANCEL_URL || 'https://yourdomain.com/paypal/cancel',
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create PayPal order: ${err}`);
  }
  return await res.json();
}

// Capture a PayPal order (after buyer approval)
export async function capturePayPalOrder(orderId) {
  const accessToken = await getPayPalAccessToken();
  const res = await fetchFn(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to capture PayPal order: ${err}`);
  }
  return await res.json();
}

// Usage example (in your route/controller):
// import { createPayPalOrder, capturePayPalOrder } from './paypalIntegration.js';
//
// // Create order:
// const order = await createPayPalOrder({ amount: '10.00', currency: 'USD' });
// // Send order.links.find(l => l.rel === 'approve').href to client for approval
//
// // After approval, capture:
// const result = await capturePayPalOrder(order.id);
