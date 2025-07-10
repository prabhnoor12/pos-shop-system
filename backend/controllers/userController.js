// userController.js
// GDPR User Data Access, Erasure, and Export Endpoints
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes user data necessary for access, erasure, and export requests.
// - Does not log or expose sensitive data (e.g., passwords, tokens).
// - All endpoints are documented with their data processing purpose.
import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Get all personal data for the authenticated user (GDPR Data Access/Export)
 * Purpose: Allows users to access/export all their personal data stored in the system.
 */
export async function getUserData(req, res) {
    try {
        const userId = req.user.id;
        // Only select necessary personal data fields
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true, updatedAt: true }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        logger.info({ event: 'GDPR_USER_DATA_ACCESS', user: userId, tenantId: req.tenantId });
        res.json({ user });
    } catch (err) {
        logger.error({ event: 'GDPR_USER_DATA_ACCESS_ERROR', error: err.message });
        res.status(500).json({ message: 'Failed to retrieve user data' });
    }
}

/**
 * Delete all personal data for the authenticated user (GDPR Erasure)
 * Purpose: Allows users to request erasure of their personal data (right to be forgotten).
 */
export async function eraseUserData(req, res) {
    try {
        const userId = req.user.id;
        // Delete user and cascade delete related data if needed
        await prisma.user.delete({ where: { id: userId } });
        logger.info({ event: 'GDPR_USER_DATA_ERASURE', user: userId, tenantId: req.tenantId });
        res.json({ message: 'Your data has been deleted as requested.' });
    } catch (err) {
        logger.error({ event: 'GDPR_USER_DATA_ERASURE_ERROR', error: err.message });
        res.status(500).json({ message: 'Failed to erase user data' });
    }
}

/**
 * Export all personal data for the authenticated user (GDPR Data Export)
 * Purpose: Allows users to export their personal data in a machine-readable format (JSON).
 */
export async function exportUserData(req, res) {
    try {
        const userId = req.user.id;
        // Only select necessary personal data fields
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true, updatedAt: true }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        logger.info({ event: 'GDPR_USER_DATA_EXPORT', user: userId, tenantId: req.tenantId });
        res.setHeader('Content-Disposition', 'attachment; filename="user-data.json"');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(user, null, 2));
    } catch (err) {
        logger.error({ event: 'GDPR_USER_DATA_EXPORT_ERROR', error: err.message });
        res.status(500).json({ message: 'Failed to export user data' });
    }
}
