// dataRetentionService.js
// Service for enforcing data retention and deletion policies (GDPR)
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes data necessary for retention and deletion.
// - Does not log or expose sensitive data.
import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Delete or anonymize user data that exceeds retention period.
 * @param {number} retentionDays - Number of days to retain user data after account deletion.
 */
export async function purgeOldUserData(retentionDays = 30) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    // Find users marked as deleted and past retention period
    const usersToPurge = await prisma.user.findMany({
        where: {
            deletedAt: { lte: cutoff }
        }
    });
    for (const user of usersToPurge) {
        // Anonymize or hard-delete user data as required
        await prisma.user.delete({ where: { id: user.id } });
        logger.info({ event: 'GDPR_USER_PURGED', user: user.id });
    }
}

/**
 * Purge old audit logs and backups past retention period.
 * @param {number} retentionDays - Number of days to retain logs.
 */
export async function purgeOldLogs(retentionDays = 90) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    // Purge audit logs
    await prisma.auditLog.deleteMany({
        where: { createdAt: { lte: cutoff } }
    });
    logger.info({ event: 'GDPR_AUDIT_LOGS_PURGED', before: cutoff });
    // Add logic for file-based log deletion if needed
}

// Schedule these functions to run periodically (e.g., with node-cron or similar)
