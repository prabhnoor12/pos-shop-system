// notificationEvents.js
// Centralized notification event types and helpers

export const NotificationEvents = {
  LOW_STOCK: 'lowStockAlert',
  SUSPICIOUS_LOGIN: 'suspiciousLogin',
  PAYMENT_FAILED: 'paymentFailed',
  NEW_SALE: 'newSale',
  NEW_CUSTOMER: 'newCustomer',
  // Add more as needed
};

// Example: build notification payloads
export function buildLowStockPayload(item) {
  return {
    productId: item.product?.id,
    productName: item.product?.name,
    store: item.store?.name,
    quantity: item.quantity,
    minStock: item.minStock,
    timestamp: new Date().toISOString()
  };
}

export function buildSuspiciousLoginPayload(user, details) {
  return {
    userId: user.id,
    email: user.email,
    ip: details.ip,
    userAgent: details.userAgent,
    timestamp: new Date().toISOString()
  };
}

export function buildPaymentFailedPayload(order, reason) {
  return {
    orderId: order.id,
    amount: order.amount,
    reason,
    timestamp: new Date().toISOString()
  };
}
