// consentRoutes.js
// GDPR Consent Management Routes
import express from 'express';
import { setConsent, getConsent } from '../controllers/consentController.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /consent - Get current consent status
router.get('/', authenticateToken, getConsent);

// POST /consent - Give or withdraw consent
router.post('/', authenticateToken, setConsent);

export default router;
