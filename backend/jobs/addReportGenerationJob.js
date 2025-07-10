// addReportGenerationJob.js
// Helper to enqueue a tenant-aware report generation job

import { reportGenerationQueue } from './queueManager.js';

/**
 * Enqueue a report generation job for a specific tenant
 * @param {number} tenantId
 * @param {string} reportType
 * @param {object} params - Additional query params for the report
 */
export async function addReportGenerationJob(tenantId, reportType, params = {}) {
  if (!tenantId) throw new Error('tenantId required');
  await reportGenerationQueue.add('generate', { tenantId, reportType, params });
}
