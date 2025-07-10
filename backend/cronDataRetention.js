
// cronDataRetention.js
// Schedules the GDPR data retention service to run daily, with logging, error handling, and notification support
import cron from 'node-cron';
import { purgeOldUserData, purgeOldLogs } from './services/dataRetentionService.js';

import winston from 'winston';
import * as Sentry from '@sentry/node';
import { sendMail } from './config/mailer.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/data-retention.log' })
  ]
});


// Send notification via email (and log)
async function notify(message, level = 'info') {
  logger.log({ level, message });
  try {
    await sendMail({
      to: process.env.NOTIFY_EMAIL || process.env.SMTP_TO,
      subject: `[GDPR] Data Retention ${level === 'error' ? 'Error' : 'Notification'}`,
      text: message
    });
  } catch (mailErr) {
    logger.error('Failed to send notification email', { error: mailErr.message });
  }
}

// Run every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('[GDPR] Running daily data retention tasks...');
  try {
    const userResult = await purgeOldUserData(30); // Purge users deleted >30 days ago
    const logResult = await purgeOldLogs(90);     // Purge logs older than 90 days
    logger.info('[GDPR] Data retention tasks complete.', { userResult, logResult });
    await notify('[GDPR] Data retention tasks completed successfully.', 'info');
  } catch (err) {
    logger.error('[GDPR] Data retention task failed', { error: err.message, stack: err.stack });
    Sentry.captureException(err);
    await notify(`[GDPR] Data retention task failed: ${err.message}`, 'error');
  }
});

// To start: node backend/cronDataRetention.js
