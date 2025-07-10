// reportGeneration.worker.js
// BullMQ worker for tenant-aware report generation jobs

import { Worker } from 'bullmq';
import { reportGenerationQueue } from './queueManager.js';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

const connection = reportGenerationQueue.opts.connection;

const worker = new Worker('reportGeneration', async job => {
  const { tenantId, reportType, params } = job.data;
  if (!tenantId) throw new Error('tenantId required for report generation');
  // Example: generate a sales report for a tenant
  let result;
  if (reportType === 'sales') {
    result = await prisma.sale.findMany({
      where: { tenantId, ...params }
    });
  } else {
    throw new Error('Unknown report type');
  }
  logger.info({ event: 'BULLMQ_REPORT_GENERATED', tenantId, reportType, count: result.length });
  // Optionally: save to file, email, or upload to S3
  return result.length;
}, { connection });

worker.on('completed', job => {
  logger.info({ event: 'BULLMQ_JOB_COMPLETED', jobId: job.id, queue: 'reportGeneration', tenantId: job.data.tenantId });
});
worker.on('failed', (job, err) => {
  logger.error({ event: 'BULLMQ_JOB_FAILED', jobId: job?.id, queue: 'reportGeneration', tenantId: job?.data?.tenantId, error: err.message });
});

export default worker;
