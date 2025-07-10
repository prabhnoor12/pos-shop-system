// auditLogCleanup.worker.js
// BullMQ worker for tenant-aware audit log cleanup

import { Worker } from 'bullmq';
import { auditLogCleanupQueue } from './queueManager.js';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

const connection = auditLogCleanupQueue.opts.connection;

const worker = new Worker('auditLogCleanup', async job => {
  const { tenantId, beforeDate } = job.data;
  if (!tenantId) throw new Error('tenantId required for audit log cleanup');
  const result = await prisma.auditLog.deleteMany({
    where: {
      tenantId,
      createdAt: { lte: beforeDate }
    }
  });
  logger.info({ event: 'BULLMQ_AUDIT_LOGS_PURGED', tenantId, before: beforeDate, deleted: result.count });
  return result.count;
}, { connection });

worker.on('completed', job => {
  logger.info({ event: 'BULLMQ_JOB_COMPLETED', jobId: job.id, queue: 'auditLogCleanup', tenantId: job.data.tenantId });
});
worker.on('failed', (job, err) => {
  logger.error({ event: 'BULLMQ_JOB_FAILED', jobId: job?.id, queue: 'auditLogCleanup', tenantId: job?.data?.tenantId, error: err.message });
});

export default worker;
