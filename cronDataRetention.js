// cronDataRetention.js
// Schedules the GDPR data retention service to run daily
import cron from 'node-cron';
import { purgeOldUserData, purgeOldLogs } from './services/dataRetentionService.js';

// Run every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[GDPR] Running daily data retention tasks...');
  await purgeOldUserData(30); // Purge users deleted >30 days ago
  await purgeOldLogs(90);     // Purge logs older than 90 days
  console.log('[GDPR] Data retention tasks complete.');
});

// To start: node backend/cronDataRetention.js
