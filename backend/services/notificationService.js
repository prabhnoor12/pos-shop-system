// notificationService.js
// Unified notification service for real-time and async alerts
// Supports WebSocket, email, and SMS (extensible)

import { broadcastInventoryUpdate, broadcastSalesUpdate, emitToUser } from '../plugins/websocket.js';
import logger from '../config/logger.js';
import { NotificationEvents, buildLowStockPayload, buildSuspiciousLoginPayload, buildPaymentFailedPayload } from './notificationEvents.js';
import { logUserAction } from './auditLogService.js';

// Send a real-time notification to all connected clients
export function notifyAll(event, payload) {
  if (event === 'inventoryUpdate') return broadcastInventoryUpdate(payload);
  if (event === 'salesUpdate') return broadcastSalesUpdate(payload);
  // Add more event types as needed
  logger.info({ event: 'NOTIFY_ALL', type: event, payload });
}

// Send a notification to a specific user (by userId)
export function notifyUser(userId, event, payload) {
  emitToUser(userId, event, payload);
  logger.info({ event: 'NOTIFY_USER', userId, type: event, payload });
}

// Example: send critical alert to admins (stub for email/SMS integration)
export function notifyAdmins(event, payload) {
  // TODO: Integrate with email/SMS provider
  logger.warn({ event: 'NOTIFY_ADMINS', type: event, payload });
}

// Example: trigger notification for low stock
export function notifyLowStock(product, req) {
  const payload = buildLowStockPayload(product);
  notifyAll('lowStockAlert', payload);
  notifyAdmins('lowStockAlert', payload);
  logUserAction({
    user: req?.user,
    action: 'LOW_STOCK_ALERT',
    resource: 'inventory',
    details: payload,
    req
  });
}

// Notify all clients and admins of a suspicious login
export function notifySuspiciousLogin(user, details, req) {
  const payload = buildSuspiciousLoginPayload(user, details);
  notifyUser(user.id, NotificationEvents.SUSPICIOUS_LOGIN, payload);
  notifyAdmins(NotificationEvents.SUSPICIOUS_LOGIN, payload);
  logUserAction({
    user,
    action: 'SUSPICIOUS_LOGIN',
    resource: 'auth',
    details: payload,
    req
  });
}

// Notify all clients and admins of a failed payment
export function notifyPaymentFailed(order, reason, req) {
  const payload = buildPaymentFailedPayload(order, reason);
  notifyAll(NotificationEvents.PAYMENT_FAILED, payload);
  notifyAdmins(NotificationEvents.PAYMENT_FAILED, payload);
  logUserAction({
    user: req?.user,
    action: 'PAYMENT_FAILED',
    resource: 'payment',
    details: payload,
    req
  });
}

// Notify all clients of a new sale
export function notifyNewSale(sale, req) {
  notifyAll(NotificationEvents.NEW_SALE, sale);
  logUserAction({
    user: req?.user,
    action: 'NEW_SALE',
    resource: 'sales',
    details: sale,
    req
  });
}

// Notify all clients of a new customer
export function notifyNewCustomer(customer, req) {
  notifyAll(NotificationEvents.NEW_CUSTOMER, customer);
  logUserAction({
    user: req?.user,
    action: 'NEW_CUSTOMER',
    resource: 'customer',
    details: customer,
    req
  });
}

// Add more notification types as needed
