// addAuditLogCleanupJob.js
// Helper to enqueue a tenant-aware audit log cleanup job

import { auditLogCleanupQueue } from './queueManager.js';

/**
 * Enqueue an audit log cleanup job for a specific tenant
 * @param {number} tenantId
 * @param {Date} beforeDate
 */
export async function addAuditLogCleanupJob(tenantId, beforeDate) {
  if (!tenantId) throw new Error('tenantId required');
  await auditLogCleanupQueue.add('cleanup', { tenantId, beforeDate });
}
