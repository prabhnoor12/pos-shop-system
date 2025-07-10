// consentController.js
// GDPR Consent Management Endpoints
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes user consent for optional data processing (e.g., marketing).
// - Does not log or expose sensitive data.
import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Give or withdraw consent for marketing or other optional processing.
 * Purpose: Allows users to manage their consent preferences.
 */
export async function setConsent(req, res) {
    const userId = req.user.id;
    const tenantId = req.tenantId;
    const { marketingConsent } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: userId, tenantId },
            data: { marketingConsent: !!marketingConsent }
        });
        logger.info({ event: 'GDPR_CONSENT_UPDATED', user: userId, marketingConsent, tenantId });
        res.json({ message: 'Consent updated', marketingConsent: user.marketingConsent });
    } catch (err) {
        logger.error({ event: 'GDPR_CONSENT_ERROR', error: err.message, tenantId });
        res.status(500).json({ message: 'Failed to update consent' });
    }
}

/**
 * Get current consent status for the authenticated user.
 */
export async function getConsent(req, res) {
    const userId = req.user.id;
    const tenantId = req.tenantId;
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId, tenantId },
            select: { marketingConsent: true }
        });
        logger.info({ event: 'GDPR_CONSENT_FETCH', user: userId, tenantId });
        res.json({ marketingConsent: user?.marketingConsent || false });
    } catch (err) {
        logger.error({ event: 'GDPR_CONSENT_FETCH_ERROR', error: err.message, tenantId });
        res.status(500).json({ message: 'Failed to fetch consent' });
    }
}
