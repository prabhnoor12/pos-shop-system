// queueManager.js
// Central BullMQ queue manager for multi-tenant SaaS

import { Queue, Worker, QueueScheduler } from 'bullmq';
import Redis from '../config/redisClient.js';

const connection = Redis.client || {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
};

// Audit log cleanup queue (per tenant)
export const auditLogCleanupQueue = new Queue('auditLogCleanup', { connection });
export const auditLogCleanupScheduler = new QueueScheduler('auditLogCleanup', { connection });

// Report generation queue (per tenant)
export const reportGenerationQueue = new Queue('reportGeneration', { connection });
export const reportGenerationScheduler = new QueueScheduler('reportGeneration', { connection });

// Advanced: add queue events for monitoring
import logger from '../config/logger.js';
import { QueueEvents } from 'bullmq';

const auditLogCleanupEvents = new QueueEvents('auditLogCleanup', { connection });
const reportGenerationEvents = new QueueEvents('reportGeneration', { connection });

auditLogCleanupEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ event: 'BULLMQ_QUEUE_FAILED', queue: 'auditLogCleanup', jobId, failedReason });
});
reportGenerationEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ event: 'BULLMQ_QUEUE_FAILED', queue: 'reportGeneration', jobId, failedReason });
});

export default {
  auditLogCleanupQueue,
  auditLogCleanupScheduler,
  reportGenerationQueue,
  reportGenerationScheduler,
  auditLogCleanupEvents,
  reportGenerationEvents
};
