// auditLogService.js
// Centralized audit trail and user activity logging
// Records critical actions for compliance, security, and analytics

import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';

const AUDIT_LOG_PATH = path.resolve('logs/audit.log');

/**
 * Write an audit log entry
 * @param {Object} entry - { userId, action, resource, details, ip, timestamp }
 */
export function writeAuditLog(entry) {
  const logEntry = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString()
  };
  // Write to file (append)
  fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(logEntry) + '\n');
  logger.info({ event: 'AUDIT_LOG', ...logEntry });
}

/**
 * Helper for logging user actions
 * @param {Object} params - { user, action, resource, details, req }
 */
export function logUserAction({ user, action, resource, details, req }) {
  writeAuditLog({
    userId: user?.id,
    action,
    resource,
    details,
    ip: req?.ip,
    userAgent: req?.get && req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
}

// Optionally: expose an API to query audit logs (for admin review)
