// notificationService.test.js
// Automated tests for notificationService.js


import { vi, describe, beforeEach, it, expect } from 'vitest';
import * as notificationService from '../services/notificationService.js';
import * as websocket from '../plugins/websocket.js';
import * as auditLogService from '../services/auditLogService.js';

vi.mock('../plugins/websocket.js', () => ({
  broadcastInventoryUpdate: vi.fn(),
  broadcastSalesUpdate: vi.fn(),
  emitToUser: vi.fn(),
}));

vi.mock('../services/auditLogService.js', () => ({
  logUserAction: vi.fn(),
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should broadcast inventory update', () => {
    notificationService.notifyAll('inventoryUpdate', { foo: 'bar' });
    expect(websocket.broadcastInventoryUpdate).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('should broadcast sales update', () => {
    notificationService.notifyAll('salesUpdate', { sale: 123 });
    expect(websocket.broadcastSalesUpdate).toHaveBeenCalledWith({ sale: 123 });
  });

  it('should emit to user', () => {
    notificationService.notifyUser(1, 'event', { data: 1 });
    expect(websocket.emitToUser).toHaveBeenCalledWith(1, 'event', { data: 1 });
  });

  it('should log user action on notifyLowStock', () => {
    const req = { user: { id: 1 } };
    notificationService.notifyLowStock({ product: 'A' }, req);
    expect(auditLogService.logUserAction).toHaveBeenCalledWith(expect.objectContaining({
      user: req.user,
      action: 'LOW_STOCK_ALERT',
      resource: 'inventory',
    }));
  });

  it('should log user action on notifySuspiciousLogin', () => {
    const user = { id: 2 };
    const details = { ip: '1.2.3.4' };
    notificationService.notifySuspiciousLogin(user, details, { user });
    expect(auditLogService.logUserAction).toHaveBeenCalledWith(expect.objectContaining({
      user,
      action: 'SUSPICIOUS_LOGIN',
      resource: 'auth',
    }));
  });

  it('should log user action on notifyPaymentFailed', () => {
    const req = { user: { id: 3 } };
    notificationService.notifyPaymentFailed({ id: 1 }, 'fail', req);
    expect(auditLogService.logUserAction).toHaveBeenCalledWith(expect.objectContaining({
      user: req.user,
      action: 'PAYMENT_FAILED',
      resource: 'payment',
    }));
  });

  it('should log user action on notifyNewSale', () => {
    const req = { user: { id: 4 } };
    notificationService.notifyNewSale({ id: 2 }, req);
    expect(auditLogService.logUserAction).toHaveBeenCalledWith(expect.objectContaining({
      user: req.user,
      action: 'NEW_SALE',
      resource: 'sales',
    }));
  });

  it('should log user action on notifyNewCustomer', () => {
    const req = { user: { id: 5 } };
    notificationService.notifyNewCustomer({ id: 3 }, req);
    expect(auditLogService.logUserAction).toHaveBeenCalledWith(expect.objectContaining({
      user: req.user,
      action: 'NEW_CUSTOMER',
      resource: 'customer',
    }));
  });
});
